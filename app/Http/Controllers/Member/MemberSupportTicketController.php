<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MemberSupportTicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rows = SupportTicket::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:140'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
        ]);

        $ticket = SupportTicket::create([
            'user_id' => $request->user()->id,
            'ticket_no' => $this->generateTicketNo(),
            'subject' => trim($data['subject']),
            'message' => trim($data['message']),
            'status' => 'open',
        ]);

        return response()->json([
            'message' => 'Support ticket submitted successfully.',
            'ticket' => $ticket,
        ], 201);
    }

    private function generateTicketNo(): string
    {
        do {
            $code = 'TKT-'.strtoupper(Str::random(8));
        } while (SupportTicket::query()->where('ticket_no', $code)->exists());

        return $code;
    }
}
