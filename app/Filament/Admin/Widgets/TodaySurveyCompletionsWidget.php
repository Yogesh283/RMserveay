<?php

namespace App\Filament\Admin\Widgets;

use App\Filament\Admin\Resources\SurveyResponses\SurveyResponseResource;
use App\Filament\Admin\Resources\Users\UserResource;
use App\Filament\Admin\Support\AdminUserTableColumns;
use App\Models\SurveyResponse;
use App\Support\AdminDashboardTodayMetrics;
use App\Support\BinaryClosingCalendar;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Database\Eloquent\Builder;

class TodaySurveyCompletionsWidget extends TableWidget
{
    protected static ?int $sort = 3;

    protected int | string | array $columnSpan = 'full';

    public function getTableHeading(): ?string
    {
        $tz = BinaryClosingCalendar::timezone();
        $date = BinaryClosingCalendar::todayDateString();
        $surveys = AdminDashboardTodayMetrics::todaySurveyActivity();

        return "Today survey fills ({$surveys['completions']} · {$surveys['distinct_users']} members · \$"
            .number_format($surveys['credited_usd'], 2).' credited) · '.$date.' · '.$tz;
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(fn (): Builder => $this->getTableQuery())
            ->columns([
                ...AdminUserTableColumns::identity('respondent'),
                TextColumn::make('respondent.name')
                    ->label('Name')
                    ->searchable(),
                TextColumn::make('survey.title')
                    ->label('Survey')
                    ->limit(40)
                    ->placeholder('—'),
                TextColumn::make('respondent_reward_usd')
                    ->label('Reward (USD)')
                    ->money('USD'),
                TextColumn::make('respondent_payout_at')
                    ->label('Paid at')
                    ->dateTime()
                    ->placeholder('Pending'),
                TextColumn::make('respondentPayoutWalletTransaction.amount')
                    ->label('Wallet credit')
                    ->money('USD')
                    ->placeholder('—'),
                TextColumn::make('respondentPayoutWalletTransaction.created_at')
                    ->label('Credit time')
                    ->dateTime()
                    ->placeholder('—'),
                TextColumn::make('updated_at')
                    ->label('Completed at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('updated_at', 'desc')
            ->emptyStateHeading('No survey completions today')
            ->paginated([10, 25, 50])
            ->recordUrl(fn (SurveyResponse $record) => SurveyResponseResource::getUrl('edit', ['record' => $record]));
    }

    protected function getTableQuery(): Builder
    {
        [$start, $end] = AdminDashboardTodayMetrics::todayBounds();

        return SurveyResponse::query()
            ->with([
                'respondent:id,login_uid,name',
                'survey:id,title',
                'respondentPayoutWalletTransaction:id,amount,created_at',
            ])
            ->where('completed', true)
            ->whereBetween('updated_at', [$start, $end])
            ->orderByDesc('updated_at');
    }
}
