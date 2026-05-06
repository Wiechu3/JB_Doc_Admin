# DocHelper

DocHelper to lokalne MVP aplikacji webowej do obsługi beneficjentów programu akceleracyjnego i ich wydatków. Aplikacja działa lokalnie na macOS, używa plików JSON jako prostej bazy danych i zapisuje dokumenty na lokalnym dysku.

## 1. Sprawdzenie Node.js i npm

```bash
node -v
npm -v
```

Jeżeli komendy nie działają, zainstaluj Node.js w wersji LTS.

## 2. Instalacja zależności

```bash
npm install
```

## 3. Uruchomienie aplikacji

```bash
npm run dev
```

## 4. Otworzenie aplikacji w przeglądarce

Otwórz:

```text
http://localhost:3000
```

## Dane lokalne

- Pliki dokumentów są przechowywane lokalnie w folderze `storage/documents`.
- Dane aplikacji są przechowywane lokalnie w folderze `data`.
- Użytkownicy są zapisywani w `data/users.json`.
- Wydatki są zapisywane w `data/expenses.json`.
- Aplikacja nie wymaga instalacji zewnętrznej bazy danych.
- Aplikacja nie wymaga uruchamiania migracji bazy danych.

Jeżeli `data/users.json` nie istnieje, aplikacja utworzy go automatycznie i doda użytkownika `ADMIN`. Jeżeli `data/expenses.json` nie istnieje, aplikacja utworzy pustą listę wydatków.
