<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="description" content="{{ config('app.name') }} — surveys, insights, and growth. Welcome to your modern platform.">
        <meta name="theme-color" content="#0B0F1A">

        <link rel="icon" type="image/png" href="{{ asset('images/logo.png') }}">
        <link rel="apple-touch-icon" href="{{ asset('images/logo.png') }}">

        {{-- Open Graph / WhatsApp / Facebook preview --}}
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="{{ config('app.name', 'RM Survey') }}">
        <meta property="og:title" content="{{ config('app.name', 'RM Survey') }}">
        <meta property="og:description" content="Join {{ config('app.name', 'RM Survey') }} — surveys, insights, and growth.">
        <meta property="og:url" content="{{ url()->current() }}">
        <meta property="og:image" content="{{ asset('images/logo.png') }}">
        <meta property="og:image:secure_url" content="{{ asset('images/logo.png') }}">
        <meta property="og:image:type" content="image/png">
        <meta property="og:image:width" content="512">
        <meta property="og:image:height" content="512">
        <meta property="og:image:alt" content="{{ config('app.name', 'RM Survey') }} logo">

        {{-- Twitter Card --}}
        <meta name="twitter:card" content="summary">
        <meta name="twitter:title" content="{{ config('app.name', 'RM Survey') }}">
        <meta name="twitter:description" content="Join {{ config('app.name', 'RM Survey') }} — surveys, insights, and growth.">
        <meta name="twitter:image" content="{{ asset('images/logo.png') }}">

        <title>{{ config('app.name', 'Laravel') }} — Welcome</title>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=plus-jakarta-sans:400,500,600,700,800" rel="stylesheet" />
        <link href="https://fonts.bunny.net/css?family=noto-sans:400,500,600,700" rel="stylesheet" />
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />
        <link href="https://fonts.bunny.net/css?family=poppins:400,500,600,700" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    </head>
    <body class="font-sans antialiased text-white">
        <div
            id="app"
            data-app-name="{{ config('app.name', 'RM Survey') }}"
            data-app-url="{{ url('/') }}"
            data-member-apk-url="{{ route('download.member-app') }}"
            data-member-apk-available="{{ is_file(config('member_apk.path')) ? '1' : '0' }}"
        ></div>
    </body>
</html>
