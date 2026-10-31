# lockdiff

*Türkçe · [English](README.md)*

**Okunamayan lockfile farklarını, gözden geçirenin gerçekten kontrol edebileceği bir özete çevirir.**

[![CI](https://github.com/ato113/lockdiff/actions/workflows/ci.yml/badge.svg)](https://github.com/ato113/lockdiff/actions/workflows/ci.yml)
[![Lisans: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Tek satırlık bir bağımlılık güncellemesi, `package-lock.json`'da üç bin satırlık
bir fark üretir. Kimse okumaz — dolayısıyla sessizce `4.2.1`'den `5.0.0`'a
atlayan dolaylı bir paketi de, bir yerden beliriveren yeni bir paketi de kimse
fark etmez.

`lockdiff` farkı değil, lockfile'ın kendisini okur ve gerçekte ne değiştiğini
yorum olarak yazar.

---

## Yorum neye benziyor

> ## Lockfile changes
>
> 14 changes across 1 file, including major version bumps.
>
> ### `package-lock.json`
>
> npm · 3 added, 10 updated, 1 removed
>
> **Worth a look**
>
> - `react` 18.3.1 → 19.0.0 — **major**
> - `tar-fs` 3.0.4 → 2.1.1 — **downgrade**
>
> <details>
> <summary>12 other changes</summary>
>
> - `clsx` added at 2.1.1
> - `picocolors` 1.0.1 → 1.1.1
> - ...
> </details>

Major sürüm atlamaları ve sürüm düşüşleri en üstte, okunacak yerde durur. Rutin
yama güncellemeleri katlanmış bölüme iner, böylece lockfile ne kadar
kalabalıklaşırsa kalabalıklaşsın yorum kısa kalır.

Yukarıdaki `tar-fs` satırı tesadüf değil: bir paketin sürümünün geri gitmesi
tedarik zinciri saldırılarının klasik imzasıdır ve sıradan bir diff'te asla göze
çarpmaz.

## Kurulum

Kurulacak bir şey yok. GitHub Action dediğimiz şey, depona koyduğun bir workflow
dosyasıdır; çalıştırmayı GitHub üstlenir.

**1.** Deponda `.github/workflows/dependencies.yml` dosyasını oluştur. Bunu
GitHub arayüzünden de yapabilirsin: **Add file → Create new file**, sonra dosya
adı olarak bu yolu yaz.

**2.** Şunu yapıştır ve commit'le:

```yaml
name: Dependencies

on: pull_request

permissions:
  contents: read
  pull-requests: write

jobs:
  lockdiff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # lockfile'ın eski halini okuyabilmek için gerekli

      - uses: ato113/lockdiff@v1
```

**3.** Lockfile değiştiren bir pull request aç. Bir dakika içinde yorum belirir.

Kurulum bu kadar. Action, pull request'in dokunduğu her lockfile'ı bulur, neyin
değiştiğini hesaplar ve tek bir yorum bırakır (sonraki push'larda yenisini
atmaz, aynısını günceller).

İki ayrıntı önemli:

- **`fetch-depth: 0` isteğe bağlı değil.** Onsuz `actions/checkout` yalnızca son
  commit'i indirir, karşılaştırılacak eski lockfile olmaz. Action bu durumda
  sessizce boş sonuç vermek yerine durumu açıkça söyler.
- **`pull-requests: write`** yorumu yazabilmesi için gerekir. Bu izin yoksa özet
  yine Actions çalıştırma sayfasına yazılır ve adım hata vermez.

## Diğer kullanım biçimleri

### Major atlamalarda kontrolü düşür

```yaml
      - uses: ato113/lockdiff@v1
        with:
          fail-on-major: true
```

Böylece major bir atlama veya sürüm düşüşü olduğunda kontrol başarısız olur —
zorunlu kontroller arasına koyabilirsin.

### Sonucu başka bir adımda kullan

```yaml
      - uses: ato113/lockdiff@v1
        id: lockdiff
        with:
          comment: false

      - if: steps.lockdiff.outputs.breaking == 'true'
        run: echo "${{ steps.lockdiff.outputs.summary }}"
```

## Desteklenen lockfile'lar

| Ekosistem | Dosyalar |
|-----------|----------|
| npm | `package-lock.json`, `npm-shrinkwrap.json` (v1, v2 ve v3) |
| Yarn | `yarn.lock` (classic ve Berry) |
| pip | `requirements*.txt` — yalnızca `==` ile sabitlenmiş sürümler |

`django>=4.0` gibi gevşek pip tanımları tahmin edilmek yerine atlanır: dosya
hangi sürümün geleceğini söylemiyorsa özet de söylemez.

## Girdiler

| Girdi | Varsayılan | Ne yapar |
|-------|-----------|----------|
| `github-token` | `${{ github.token }}` | Yorumu yazarken kullanılan token |
| `files` | otomatik | İncelenecek lockfile'lar, satır başına bir tane. Varsayılan: PR'ın dokunduğu hepsi |
| `base` | PR'ın base'i | Karşılaştırma yapılacak ref |
| `comment` | `true` | Özeti PR yorumu olarak yaz, sonraki push'larda güncelle |
| `fail-on-major` | `false` | Major atlama veya sürüm düşüşünde kontrolü düşür |

## Çıktılar

| Çıktı | Örnek |
|-------|-------|
| `changed` | `14` |
| `breaking` | `true` |
| `summary` | `14 dependency changes, including major bumps.` |
| `body` | Markdown özetin tamamı |

## Bilmekte fayda var

- `0.x` sürümlerde minor artış major sayılır. Pratikte `0.1.0 → 0.2.0` bir şeyleri
  kırar ve inceleyen kişinin bunu görmesi gerekir.
- Yorum her push'ta yeniden atılmaz, yerinde güncellenir.
- Token yorum yazamıyorsa özet yine Actions çalıştırma sayfasına düşer ve adım
  hata vermez.

## Geliştirme

```bash
npm ci
npm test          # vitest
npm run typecheck
npm run build     # src/ klasörünü ncc ile dist/ içine paketler
```

`dist/` klasörü depoya commit'lenir, çünkü GitHub'ın çalıştırdığı şey odur. CI,
`dist/`in kaynakla uyuşmadığını görürse başarısız olur — commit'lemeden önce
`npm run build` çalıştır.

## Katkı

Issue ve pull request'ler memnuniyetle karşılanır. Yeni bir ekosistem eklemek,
`src/parsers/` içine dosyayı `{ name, version }` çiftlerine çeviren tek bir
parser yazmak demek; sonrasındaki her şey ortaktır.

Yapay zekâ destekli katkılar sorun değil; yeter ki pull request'te belirt ve
gönderdiğin kodu açıklayabil.

## Lisans

MIT — [LICENSE](LICENSE) dosyasına bak.
