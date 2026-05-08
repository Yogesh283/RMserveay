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
        return response()->json($this->team->overview($request->user()));
    }

    public function binaryTree(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'depth' => ['sometimes', 'integer', 'min:1', 'max:8'],
            'node_id' => ['sometimes', 'integer', 'min:1'],
        ]);

        $depth = (int) ($validated['depth'] ?? 4);
        $user = $request->user();
        $startUser = $user;

        /** When client requests a descendant subtree (lazy expand), verify the chain. */
        if (! empty($validated['node_id']) && (int) $validated['node_id'] !== (int) $user->id) {
            $candidate = User::find((int) $validated['node_id']);
            if (! $candidate) {
                abort(404);
            }

            $cursor = $candidate;
            $hops = 0;
            while ($cursor !== null && (int) $cursor->id !== (int) $user->id && $hops < 64) {
                $cursor = $cursor->binary_parent_id ? User::find($cursor->binary_parent_id) : null;
                $hops++;
            }

            if ($cursor === null || (int) $cursor->id !== (int) $user->id) {
                abort(403);
            }

            $startUser = $candidate;
        }

        return response()->json($this->team->binaryPreview($startUser, $depth));
    }
}
