<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class PasswordResetMail extends Mailable
{
    use Queueable;

    public $storeName;

    public $resetUrl;

    public $token;

    public function __construct(string $storeName, string $resetUrl, string $token)
    {
        $this->storeName = $storeName;
        $this->resetUrl  = $resetUrl;
        $this->token     = $token;
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Atur Ulang Password - ' . $this->storeName);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.password-reset');
    }
}