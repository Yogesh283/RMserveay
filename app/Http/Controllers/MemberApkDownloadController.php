<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MemberApkDownloadController extends Controller
{
    public function __invoke(): BinaryFileResponse
    {
        $path = config('member_apk.path');

        if (! is_string($path) || ! is_file($path)) {
            abort(404, 'Android app is not available for download yet.');
        }

        return response()->download(
            $path,
            config('member_apk.download_name'),
            ['Content-Type' => 'application/vnd.android.package-archive'],
        );
    }
}
