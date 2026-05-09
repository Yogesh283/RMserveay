<?php

namespace App\Filament\Admin\Resources\Surveys\Pages;

use App\Filament\Admin\Resources\Surveys\SurveyResource;
use App\Models\User;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Auth;

class CreateSurvey extends CreateRecord
{
    protected static string $resource = SurveyResource::class;

    /**
     * Auto-assign owner: current logged-in admin (or first publisher / first user as fallback).
     * This is why the form does not show a "Publisher (owner)" picker.
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['user_id'] = $this->resolveOwnerId();
        $data['response_count'] = 0;
        $data['earnings_total'] = 0;

        return $data;
    }

    private function resolveOwnerId(): int
    {
        $authId = Auth::id();
        if ($authId !== null && User::query()->whereKey($authId)->exists()) {
            return (int) $authId;
        }

        $publisherId = User::query()->where('user_type', 'publisher')->orderBy('id')->value('id');
        if ($publisherId !== null) {
            return (int) $publisherId;
        }

        $anyId = User::query()->orderBy('id')->value('id');

        return (int) ($anyId ?? 1);
    }
}
