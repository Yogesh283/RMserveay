<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COMPOSITE_INDEX = 'survey_responses_respondent_user_id_survey_id_index';

    public function up(): void
    {
        if (! Schema::hasTable('survey_responses')) {
            return;
        }

        Schema::table('survey_responses', function (Blueprint $table) {
            if (! Schema::hasColumn('survey_responses', 'respondent_user_id')) {
                $table->foreignId('respondent_user_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            }
        });

        if (! Schema::hasColumn('survey_responses', 'respondent_user_id')) {
            return;
        }

        if ($this->indexExists('survey_responses', self::COMPOSITE_INDEX)) {
            return;
        }

        Schema::table('survey_responses', function (Blueprint $table) {
            $table->index(['respondent_user_id', 'survey_id']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('survey_responses') || ! Schema::hasColumn('survey_responses', 'respondent_user_id')) {
            return;
        }

        if ($this->indexExists('survey_responses', self::COMPOSITE_INDEX)) {
            Schema::table('survey_responses', function (Blueprint $table) {
                $table->dropIndex(['respondent_user_id', 'survey_id']);
            });
        }

        Schema::table('survey_responses', function (Blueprint $table) {
            $table->dropForeign(['respondent_user_id']);
            $table->dropColumn('respondent_user_id');
        });
    }

    /**
     * Without doctrine/dbal (removed from modern Laravel by default).
     */
    private function indexExists(string $table, string $indexName): bool
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $rows = DB::select(
                'SHOW INDEX FROM `'.$table.'` WHERE Key_name = ?',
                [$indexName]
            );

            return count($rows) > 0;
        }

        if ($driver === 'sqlite') {
            $rows = DB::select(
                'SELECT 1 FROM sqlite_master WHERE type = ? AND name = ? LIMIT 1',
                ['index', $indexName]
            );

            return count($rows) > 0;
        }

        if ($driver === 'pgsql') {
            $schema = Schema::getConnection()->getConfig('schema') ?? 'public';
            $rows = DB::select(
                'SELECT 1 FROM pg_indexes WHERE schemaname = ? AND tablename = ? AND indexname = ? LIMIT 1',
                [$schema, $table, $indexName]
            );

            return count($rows) > 0;
        }

        return false;
    }
};
