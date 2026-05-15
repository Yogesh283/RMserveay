<?php

namespace App\Filament\Admin\Widgets;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\MatchingPayout;
use Filament\Tables\Columns\Summarizers\Sum;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class TodayMatchingPayoutsWidget extends TableWidget
{
    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    public function getTableHeading(): ?string
    {
        return "Today's matching payouts ({$this->closingDateLabel()})";
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
            ->defaultSort('payout_usd', 'desc')
            ->emptyStateHeading('No matching payouts today')
            ->emptyStateDescription('Paid members appear here after the daily binary closing runs.')
            ->paginated([10, 25, 50, 100])
            ->recordUrl(fn (MatchingPayout $record): string => UserResource::getUrl('view', ['record' => $record->user_id]));
    }

    protected function getTableQuery(): Builder
    {
        return MatchingPayout::query()
            ->with('user')
            ->whereDate('closing_date', $this->closingDate());
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

    protected function closingDate(): string
    {
        return Carbon::now(config('binary_closing.timezone', 'Asia/Kolkata'))->toDateString();
    }

    protected function closingDateLabel(): string
    {
        return Carbon::now(config('binary_closing.timezone', 'Asia/Kolkata'))->format('d M Y');
    }
}
