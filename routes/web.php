<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');

Route::fallback(fn () => view('welcome'));
