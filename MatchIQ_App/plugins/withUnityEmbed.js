const fs = require('fs');
const path = require('path');
const {
  withProjectBuildGradle,
  withSettingsGradle,
  withGradleProperties,
  withStringsXml,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');

const UNITY_REL = 'unity/builds/android';
const DEFAULT_NDK = '27.0.12077973';

function unityLibraryExists(projectRoot) {
  return fs.existsSync(
    path.join(projectRoot, UNITY_REL, 'unityLibrary', 'build.gradle'),
  );
}

function withUnityFlatDir(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes("project(':unityLibrary')")) {
      return mod;
    }
    const projectRoot = mod.modRequest.projectRoot;
    if (!unityLibraryExists(projectRoot)) {
      return mod;
    }
    const flatDir = `
        flatDir {
            dirs "\${project(':unityLibrary').projectDir}/libs"
        }
`;
    if (mod.modResults.contents.includes("maven { url 'https://www.jitpack.io' }")) {
      mod.modResults.contents = mod.modResults.contents.replace(
        "maven { url 'https://www.jitpack.io' }",
        `maven { url 'https://www.jitpack.io' }\n${flatDir}`,
      );
    } else if (mod.modResults.contents.includes('allprojects')) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        (m) => `${m}\n${flatDir}`,
      );
    }
    return mod;
  });
}

function withUnitySettings(config) {
  return withSettingsGradle(config, (mod) => {
    if (mod.modResults.contents.includes("include ':unityLibrary'")) {
      return mod;
    }
    const projectRoot = mod.modRequest.projectRoot;
    if (!unityLibraryExists(projectRoot)) {
      mod.modResults.contents += `
// Match IQ: unityLibrary not exported yet — skip include.
// Export Unity to ${UNITY_REL} then re-run prebuild.
`;
      return mod;
    }
    mod.modResults.contents += `
include ':unityLibrary'
project(':unityLibrary').projectDir = new File(rootProject.projectDir, '../${UNITY_REL}/unityLibrary')
`;
    return mod;
  });
}

function withUnityGradleProps(config) {
  return withGradleProperties(config, (mod) => {
    const has = mod.modResults.some(
      (p) => p.type === 'property' && p.key === 'unityStreamingAssets',
    );
    if (!has) {
      mod.modResults.push({
        type: 'property',
        key: 'unityStreamingAssets',
        value: '.unity3d',
      });
    }
    return mod;
  });
}

function withUnityStrings(config) {
  return withStringsXml(config, (mod) => {
    mod.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          _: 'Game View',
          $: { name: 'game_view_content_description' },
        },
      ],
      mod.modResults,
    );
    return mod;
  });
}

function withUnityLibraryPatch(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      if (!unityLibraryExists(projectRoot)) {
        console.warn(
          '[withUnityEmbed] Skipping unityLibrary patch — export Unity first to ' +
            UNITY_REL,
        );
        return mod;
      }

      const ndk =
        process.env.UNITY_NDK_VERSION ||
        config?.plugins?.find?.(
          (p) => Array.isArray(p) && p[0] === './plugins/withUnityEmbed.js',
        )?.[1]?.unityNdkVersion ||
        DEFAULT_NDK;

      const gradlePath = path.join(
        projectRoot,
        UNITY_REL,
        'unityLibrary',
        'build.gradle',
      );
      let gradle = fs.readFileSync(gradlePath, 'utf8');
      if (!gradle.includes('ndkVersion')) {
        gradle = gradle.replace(
          /defaultConfig\s*\{/,
          `defaultConfig {\n        ndkVersion "${ndk}"`,
        );
      }
      gradle = gradle.replace(/android\.ndkDirectory(?!\.absolutePath)/g, 'android.ndkDirectory.absolutePath');
      fs.writeFileSync(gradlePath, gradle);

      // Remove LAUNCHER intent-filter so Unity is library-only
      const manifestPath = path.join(
        projectRoot,
        UNITY_REL,
        'unityLibrary',
        'src',
        'main',
        'AndroidManifest.xml',
      );
      if (fs.existsSync(manifestPath)) {
        let xml = fs.readFileSync(manifestPath, 'utf8');
        xml = xml.replace(
          /<intent-filter>\s*<action android:name="android.intent.action.MAIN"\s*\/>\s*<category android:name="android.intent.category.LAUNCHER"\s*\/>\s*<\/intent-filter>/g,
          '',
        );
        fs.writeFileSync(manifestPath, xml);
      }

      return mod;
    },
  ]);
}

function withUnityEmbed(config) {
  config = withUnityFlatDir(config);
  config = withUnitySettings(config);
  config = withUnityGradleProps(config);
  config = withUnityStrings(config);
  config = withUnityLibraryPatch(config);
  return config;
}

module.exports = withUnityEmbed;
