<?php

namespace App\Filament\Admin\Widgets;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\MatchingPayout;
use App\Support\BinaryClosingCalendar;
use Filament\Tables\Columns\Summarizers\Sum;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Database\Eloquent\Builder;

class TodayMatchingPayoutsWidget extends TableWidget
{
    protected static ?int $sort = 5;

    protected int | string | array $columnSpan = 'full';

    public function getTableHeading(): ?string
    {
        $tz = BinaryClosingCalendar::timezone();
        $y = BinaryClosingCalendar::yesterdayDateString();
        $t = BinaryClosingCalendar::todayDateString();

        return "Matching payouts (closing dates {$y} & {$t} · {$tz})";
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(fn (): Builder => $this->getTableQuery())
            ->columns([
                TextColumn::make('user.login_uid')
                    ->label('User ID')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('user.name')
                    ->label('Name')
                    ->searchable()
                    ->toggleable(),
                TextColumn::make('scope')
                    ->label('Type')
                    ->formatStateUsing(fn (string $state): string => self::scopeLabel($state))
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        MatchingPayout::SCOPE_ACTIVE_PANEL => 'success',
                        MatchingPayout::SCOPE_PANEL => 'info',
                        MatchingPayout::SCOPE_SUPER => 'warning',
                        default => 'gray',
                    })
                    ->sortable(),
                TextColumn::make('closing_date')
                    ->label('Closing date')
                    ->date()
                    ->sortable(),
                TextColumn::make('pairs_matched')
                    ->label('Pairs')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('milestone')
                    ->label('Milestone')
                    ->placeholder('—')
                    ->sortable(),
                TextColumn::make('payout_usd')
                    ->label('Paid (USD)')
                    ->money('USD')
                    ->sortable()
                    ->summarize([
                        Sum::make()
                            ->money('USD')
                            ->label('Total'),
                    ]),
                TextColumn::make('balance_after_usd')
                    ->label('Balance after')
                    ->money('USD')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->label('Credited at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('closing_date', 'desc')
            ->emptyStateHeading('No matching payouts for recent closing dates')
            ->emptyStateDescription('Cron closes yesterday in the closing timezone. After binary:daily-closing runs, rows appear for that closing date.')
            ->paginated([10, 25, 50, 100])
            ->recordUrl(fn (MatchingPayout $record): string => UserResource::getUrl('view', ['record' => $record->user_id]));
    }

    protected function getTableQuery(): Builder
    {
        return MatchingPayout::query()
            ->with('user')
            ->whereIn('closing_date', [
                BinaryClosingCalendar::yesterdayDateString(),
                BinaryClosingCalendar::todayDateString(),
            ])
            ->orderByDesc('closing_date')
            ->orderByDesc('payout_usd');
    }

    public static function scopeLabel(string $scope): string
    {
        return match ($scope) {
            MatchingPayout::SCOPE_ACTIVE_PANEL => 'Active panel',
            MatchingPayout::SCOPE_PANEL => 'Sub panel',
            MatchingPayout::SCOPE_SUPER => 'Super panel',
            default => $scope,
        };
    }

}
