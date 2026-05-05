<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
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
        ]);

        $depth = (int) ($validated['depth'] ?? 4);

        return response()->json($this->team->binaryPreview($request->user(), $depth));
    }
}
