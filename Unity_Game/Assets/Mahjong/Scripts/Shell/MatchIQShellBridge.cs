using System;
using System.Collections;
using System.Collections.Generic;
using Mkey.Tournament;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Mkey.Shell
{
    /// <summary>
    /// Bridges Match IQ React Native UI ↔ Unity gameplay.
    /// Launch:  matchiqunity://play?matchId&amp;mode&amp;token[&amp;tournamentId][&amp;levelId]
    /// Return:  matchiq://match-result?matchId&amp;won&amp;score&amp;...
    /// </summary>
    [DefaultExecutionOrder(-200)]
    public class MatchIQShellBridge : MonoBehaviour
    {
        private const string ResultScheme = "matchiq://match-result";
        private const float LaunchDelaySeconds = 0.35f;

        private static MatchIQShellBridge instance;

        public static bool IsActive { get; private set; }

        private string matchId;
        private string tournamentId;
        private string mode = "practice";
        private string token;
        private string levelId;
        private int pendingLevel = TournamentSession.SharedGameLevelIndex;
        private float playStartedAt = -1f;
        private bool returning;
        private bool launchQueued;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Bootstrap()
        {
            if (instance) return;

            GameObject host = new GameObject(nameof(MatchIQShellBridge));
            instance = host.AddComponent<MatchIQShellBridge>();
            DontDestroyOnLoad(host);
        }

        private void Awake()
        {
            if (instance && instance != this)
            {
                Destroy(gameObject);
                return;
            }

            instance = this;
            DontDestroyOnLoad(gameObject);

            Application.deepLinkActivated += OnDeepLinkActivated;
            SceneManager.sceneLoaded += OnSceneLoaded;
            TryConsumeUrl(Application.absoluteURL);
        }

        private void OnDestroy()
        {
            if (instance == this)
            {
                Application.deepLinkActivated -= OnDeepLinkActivated;
                SceneManager.sceneLoaded -= OnSceneLoaded;
            }
        }

        private void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            if (!IsActive || scene.buildIndex != TournamentSession.GameSceneIndex) return;

            // GameLevelHolder.Awake resets CurrentLevel to 0 — re-apply before GameBoard.Start.
            GameLevelHolder.CurrentLevel = pendingLevel;
            if (playStartedAt < 0f)
            {
                CampaignLevelTimer.Reset();
                CampaignLevelTimer.Start();
                playStartedAt = Time.realtimeSinceStartup;
            }
        }

        private void Update()
        {
            if (!IsActive || returning) return;

            // Android back / Esc → return defeat to RN shell
            if (Input.GetKeyDown(KeyCode.Escape))
                ReturnMatchResult(false);
        }

        private void OnDeepLinkActivated(string url) => TryConsumeUrl(url);

        private void TryConsumeUrl(string url)
        {
            if (string.IsNullOrEmpty(url)) return;
            if (!url.StartsWith("matchiqunity://", StringComparison.OrdinalIgnoreCase)) return;

            Dictionary<string, string> q = ParseQuery(url);
            matchId = Get(q, "matchId", $"match-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}");
            tournamentId = Get(q, "tournamentId", null);
            mode = Get(q, "mode", "practice");
            token = Get(q, "token", null);
            levelId = Get(q, "levelId", null);

            pendingLevel = TournamentSession.SharedGameLevelIndex;
            if (!string.IsNullOrEmpty(levelId) && int.TryParse(levelId, out int parsed))
                pendingLevel = Mathf.Max(0, parsed);

            IsActive = true;
            returning = false;
            playStartedAt = -1f;

            Debug.Log($"[MatchIQShell] Launch received matchId={matchId} mode={mode} level={pendingLevel}");

            if (!launchQueued)
            {
                launchQueued = true;
                StartCoroutine(LaunchGameplayWhenReady());
            }
        }

        private IEnumerator LaunchGameplayWhenReady()
        {
            yield return new WaitForSecondsRealtime(LaunchDelaySeconds);

            GameLevelHolder.CurrentLevel = pendingLevel;
            CampaignLevelTimer.Reset();
            CampaignLevelTimer.Start();
            playStartedAt = Time.realtimeSinceStartup;

            // Clear any leftover tournament session so campaign win path runs
            if (TournamentSession.IsActive)
                TournamentSession.Clear();

            int gameScene = TournamentSession.GameSceneIndex;
            Debug.Log($"[MatchIQShell] Loading gameplay scene {gameScene} level={pendingLevel}");

            if (SceneLoader.Instance)
                SceneLoader.Instance.LoadScene(gameScene);
            else
                SceneManager.LoadScene(gameScene);

            launchQueued = false;
        }

        /// <summary>
        /// Called when the shell-driven match finishes (win/lose).
        /// Opens the RN app via deep link with result payload.
        /// </summary>
        public static void ReturnMatchResult(bool won)
        {
            if (!instance || !IsActive || instance.returning) return;
            instance.returning = true;

            int score = ScoreHolder.Instance ? ScoreHolder.Count : 0;
            float elapsed = instance.playStartedAt > 0f
                ? Mathf.Max(1f, Time.realtimeSinceStartup - instance.playStartedAt)
                : Mathf.Max(1f, CampaignLevelTimer.ElapsedSeconds);

            int accuracy = won
                ? Mathf.Clamp(78 + UnityEngine.Random.Range(0, 20), 50, 100)
                : Mathf.Clamp(45 + UnityEngine.Random.Range(0, 30), 20, 85);
            int coins = won ? 150 + UnityEngine.Random.Range(0, 200) : 20;
            int xp = won ? 80 + UnityEngine.Random.Range(0, 40) : 25;

            var p = new Dictionary<string, string>
            {
                ["matchId"] = instance.matchId ?? $"match-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                ["won"] = won ? "true" : "false",
                ["score"] = score.ToString(),
                ["timeSeconds"] = Mathf.RoundToInt(elapsed).ToString(),
                ["accuracy"] = accuracy.ToString(),
                ["coinsEarned"] = coins.ToString(),
                ["xpEarned"] = xp.ToString(),
                ["opponentName"] = "TempleFox",
            };
            if (!string.IsNullOrEmpty(instance.tournamentId))
                p["tournamentId"] = instance.tournamentId;

            string url = ResultScheme + "?" + ToQuery(p);
            // Also send JSON for embedded UnityView (same APK)
            string json =
                "{" +
                $"\"type\":\"match-result\"," +
                $"\"matchId\":\"{EscapeJson(p["matchId"])}\"," +
                $"\"won\":{(won ? "true" : "false")}," +
                $"\"score\":{score}," +
                $"\"timeSeconds\":{Mathf.RoundToInt(elapsed)}," +
                $"\"accuracy\":{accuracy}," +
                $"\"coinsEarned\":{coins}," +
                $"\"xpEarned\":{xp}," +
                $"\"opponentName\":\"TempleFox\"" +
                (string.IsNullOrEmpty(instance.tournamentId)
                    ? ""
                    : $",\"tournamentId\":\"{EscapeJson(instance.tournamentId)}\"") +
                "}";

            Debug.Log($"[MatchIQShell] Returning to RN: {url}");

            IsActive = false;
            CampaignLevelTimer.Stop();

            try
            {
                SendToReactNative(json);
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[MatchIQShell] Embedded RN message failed: " + ex.Message);
            }

            try
            {
                Application.OpenURL(url);
            }
            catch (Exception ex)
            {
                Debug.LogException(ex);
            }
        }

        /// <summary>Called from React Native UnityView.postMessage.</summary>
        public void OnReactNativeLaunch(string json)
        {
            if (string.IsNullOrEmpty(json)) return;
            Debug.Log("[MatchIQShell] OnReactNativeLaunch " + json);
            try
            {
                // Lightweight parse without full JSON lib
                string asUrl = "matchiqunity://play?" + JsonObjectToQuery(json);
                TryConsumeUrl(asUrl);
            }
            catch (Exception ex)
            {
                Debug.LogException(ex);
            }
        }

        private static void SendToReactNative(string message)
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using (var jc = new AndroidJavaClass("com.azesmwayreactnativeunity.ReactNativeUnityViewManager"))
                {
                    jc.CallStatic("sendMessageToMobileApp", message);
                    return;
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[MatchIQShell] ReactNativeUnityViewManager missing: " + ex.Message);
            }
#endif
            Debug.Log("[MatchIQShell] RN message (editor/fallback): " + message);
        }

        private static string EscapeJson(string s) =>
            (s ?? string.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"");

        private static string JsonObjectToQuery(string json)
        {
            // Expect flat JSON: {"matchId":"...","mode":"practice",...}
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            string body = json.Trim();
            if (body.StartsWith("{")) body = body.Substring(1);
            if (body.EndsWith("}")) body = body.Substring(0, body.Length - 1);
            string[] parts = body.Split(',');
            for (int i = 0; i < parts.Length; i++)
            {
                string part = parts[i].Trim();
                int colon = part.IndexOf(':');
                if (colon <= 0) continue;
                string key = part.Substring(0, colon).Trim().Trim('"');
                string val = part.Substring(colon + 1).Trim().Trim('"');
                map[key] = val;
            }
            return ToQuery(map);
        }

        public static bool TryHandleCampaignWin()
        {
            if (!IsActive) return false;
            CampaignLevelTimer.Stop();
            ReturnMatchResult(true);
            return true;
        }

        private static string Get(Dictionary<string, string> q, string key, string fallback)
        {
            if (q != null && q.TryGetValue(key, out string v) && !string.IsNullOrEmpty(v))
                return Uri.UnescapeDataString(v);
            return fallback;
        }

        private static Dictionary<string, string> ParseQuery(string url)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            int qIndex = url.IndexOf('?');
            if (qIndex < 0 || qIndex >= url.Length - 1) return result;

            string query = url.Substring(qIndex + 1);
            string[] pairs = query.Split('&');
            for (int i = 0; i < pairs.Length; i++)
            {
                string pair = pairs[i];
                if (string.IsNullOrEmpty(pair)) continue;
                int eq = pair.IndexOf('=');
                if (eq <= 0)
                {
                    result[Uri.UnescapeDataString(pair)] = string.Empty;
                    continue;
                }

                string key = Uri.UnescapeDataString(pair.Substring(0, eq));
                string value = Uri.UnescapeDataString(pair.Substring(eq + 1));
                result[key] = value;
            }

            return result;
        }

        private static string ToQuery(Dictionary<string, string> p)
        {
            var parts = new List<string>(p.Count);
            foreach (KeyValuePair<string, string> kv in p)
            {
                if (kv.Value == null) continue;
                parts.Add(Uri.EscapeDataString(kv.Key) + "=" + Uri.EscapeDataString(kv.Value));
            }

            return string.Join("&", parts);
        }
    }
}
