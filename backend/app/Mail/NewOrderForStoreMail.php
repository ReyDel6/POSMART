<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class NewOrderForStoreMail extends Mailable
{
    use Queueable;

    public $order;

    public $store;

    public $items;

    public $isWalkIn;

    public function __construct($order, array $store, array $items, bool $isWalkIn = false)
    {
        $this->order    = $order;
        $this->store    = $store;
        $this->items    = $items;
        $this->isWalkIn = $isWalkIn;
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Pesanan Baru #' . $this->order->id . ' - ' . ($this->store['store_name'] ?? 'Toko'));
    }

    public function content(): Content
    {
        return new Content(view: 'emails.new-order-store');
    }
}