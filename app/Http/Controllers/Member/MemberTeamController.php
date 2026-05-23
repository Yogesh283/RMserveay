<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MemberTeamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberTeamController extends Controller
{
    public function __construct(
        protected MemberTeamService $team,
    ) {}

    public function overview(Request $request): JsonResponse
    {
        $date = $request->query('date');

        return response()->json($this->team->overview(
            $request->user(),
            is_string($date) && $date !== '' ? $date : null,
        ));
    }

    public function levelIncome(Request $request): JsonResponse
    {
        return response()->json($this->team->levelIncomeWithTeamByLevel($request->user()));
    }

    public function binaryTree(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'depth' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'node_id' => ['sometimes', 'integer', 'min:1'],
            'uid' => ['sometimes', 'string', 'max:64'],
        ]);

        $depth = (int) ($validated['depth'] ?? 100);
        $user = $request->user();
        $startUser = $user;

        /** Search by login_uid: only members within the current user's binary subtree. */
        $candidate = null;
        if (! empty($validated['uid'])) {
            $candidate = User::query()->where('login_uid', trim((string) $validated['uid']))->first();
            if (! $candidate) {
                return response()->json(['message' => 'No member found with this User ID in your team.'], 404);
            }
        } elseif (! empty($validated['node_id']) && (int) $validated['node_id'] !== (int) $user->id) {
            $candidate = User::find((int) $validated['node_id']);
            if (! $candidate) {
                abort(404);
            }
        }

        /** When client requests a descendant subtree (lazy expand or UID search), verify the chain. */
        if ($candidate !== null && (int) $candidate->id !== (int) $user->id) {
            $cursor = $candidate;
            $hops = 0;
            while ($cursor !== null && (int) $cursor->id !== (int) $user->id && $hops < 64) {
                $cursor = $cursor->binary_parent_id ? User::find($cursor->binary_parent_id) : null;
                $hops++;
            }

            if ($cursor === null || (int) $cursor->id !== (int) $user->id) {
                if (! empty($validated['uid'])) {
                    return response()->json(['message' => 'This User ID is not part of your binary team.'], 403);
                }
                abort(403);
            }

            $startUser = $candidate;
        }

        return response()->json($this->team->binaryPreview($startUser, $depth));
    }
}
