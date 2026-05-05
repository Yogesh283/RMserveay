<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\PublisherNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublisherNotificationsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = PublisherNotification::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'title' => $n->title,
                'body' => $n->body,
                'type' => $n->type,
                'readAt' => $n->read_at?->toIso8601String(),
                'createdAt' => $n->created_at->toIso8601String(),
            ]);

        return response()->json(['notifications' => $items]);
    }
}
