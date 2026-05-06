# DocHelper

DocHelper to lokalne MVP aplikacji webowej do obsługi beneficjentów programu akceleracyjnego, ich wydatków oraz podstawowych dokumentów onboardingowych. Aplikacja działa lokalnie na macOS, używa plików JSON jako prostej bazy danych i zapisuje dokumenty na lokalnym dysku.

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
- Dokumenty onboardingowe wysłane przez beneficjentów są zapisywane w `data/onboardingDocuments.json`.
- Aplikacja nie wymaga instalacji zewnętrznej bazy danych.
- Aplikacja nie wymaga uruchamiania migracji bazy danych.

Jeżeli `data/users.json` nie istnieje, aplikacja utworzy go automatycznie i doda użytkownika `ADMIN`. Jeżeli `data/expenses.json` albo `data/onboardingDocuments.json` nie istnieją, aplikacja utworzy puste listy.

## Aktualne funkcje MVP

- ADMIN może dodać beneficjenta i utworzyć jego lokalny folder dokumentów.
- Beneficjent może dodać wydatek z datą wydatku, opisem, kwotami, kontrahentem, NIP-em i celem.
- Cel wydatku jest wybierany jako `Priorytetowy` albo `Szczegółowy`.
- Beneficjent dodaje obowiązkową fakturę oraz opcjonalne pozostałe dokumenty.
- Pliki wydatków są zapisywane lokalnie w `storage/documents/{folderName}/wydatki`.
- ADMIN może filtrować wydatki po dacie wydatku, statusie, beneficjencie i celu.
- ADMIN może wybrać widok `WSZYSCY` i zobaczyć wydatki wszystkich beneficjentów w jednej tabeli.
- ADMIN może zatwierdzać, odrzucać i komentować wydatki.
- Zakładka `DOKUMENTY ONBOARDING` zawiera sekcje `Witamy`, `Paczka marketingowa`, `Kontakt` i `Dokumenty do wypełnienia`.
- W onboardingu można pobrać placeholder PDF `formularz_onboarding_placeholder.pdf`.
- Beneficjent może wysłać wypełniony dokument onboardingowy.
- Dokumenty onboardingowe są zapisywane lokalnie w `storage/documents/{folderName}/onboarding`.
- Beneficjent widzi listę swoich wysłanych dokumentów onboardingowych.
- ADMIN widzi dokumenty onboardingowe wysłane przez beneficjentów i może filtrować je po beneficjencie albo wybrać `WSZYSCY`.
