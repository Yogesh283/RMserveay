<?php

namespace Tests\Feature;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_and_returns_json(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $email = 'register-test-'.uniqid('', true).'@example.com';

        $response = $this->postJson('/api/register', [
            'name' => 'Register Test',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', $email)
            ->assertJsonPath('user.name', 'Register Test');

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'name' => 'Register Test',
        ]);
    }
}
