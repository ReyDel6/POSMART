//File: src/hooks/useLocalStorage.js

import { useState, useEffect } from "react";

export function useLocalStorage(key, initialValue) {
    // Lazy initial State 
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            console.error('Gagal membaca local storage');
            return initialValue;
        }
    });

    // 2. Store Value automatic based on dependency [key, storedValue]
    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch {
            console.error('Gagal menyimpan ke local storage');
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}