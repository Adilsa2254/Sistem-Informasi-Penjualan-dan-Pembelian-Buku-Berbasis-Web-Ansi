"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

const books = [
  {
    title: "The Creative Act",
    author: "Rick Rubin",
    category: "Kreativitas",
    condition: "Sangat baik",
    type: "Dijual",
    price: "Rp 145.000",
    color: "sand",
    size: "book-card--wide",
    coverImage: "/covers/the-creative-act.svg",
    coverStyle: "creative",
  },
  {
    title: "Filosofi Teras",
    author: "Henry Manampiring",
    category: "Filosofi",
    condition: "Bekas layak",
    type: "Dijual",
    price: "Rp 75.000",
    color: "olive",
    size: "",
    coverImage: "/covers/filosofi-teras.svg",
    coverStyle: "philosophy",
  },
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    category: "Fiksi",
    condition: "Sangat baik",
    type: "Ditukar",
    price: "Tukar buku",
    color: "peach",
    size: "",
    coverImage: "/covers/the-midnight-library.svg",
    coverStyle: "midnight",
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    category: "Pengembangan diri",
    condition: "Seperti baru",
    type: "Dijual",
    price: "Rp 110.000",
    color: "blue",
    size: "book-card--tall",
    coverImage: "/covers/atomic-habits.svg",
    coverStyle: "atomic",
  },
  {
    title: "Laut Bercerita",
    author: "Leila S. Chudori",
    category: "Fiksi",
    condition: "Sangat baik",
    type: "Dijual",
    price: "Rp 95.000",
    color: "peach",
    size: "",
    coverImage: "/covers/laut-bercerita.svg",
    coverStyle: "midnight",
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    category: "Sejarah",
    condition: "Seperti baru",
    type: "Dijual",
    price: "Rp 125.000",
    color: "sand",
    size: "",
    coverImage: "/covers/sapiens.svg",
    coverStyle: "creative",
  },
  {
    title: "Negeri 5 Menara",
    author: "Ahmad Fuadi",
    category: "Inspirasi",
    condition: "Bekas layak",
    type: "Ditukar",
    price: "Tukar buku",
    color: "olive",
    size: "",
    coverImage: "/covers/negeri-5-menara.svg",
    coverStyle: "philosophy",
  },
  {
    title: "Ikigai",
    author: "Héctor García & Francesc Miralles",
    category: "Pengembangan diri",
    condition: "Sangat baik",
    type: "Dijual",
    price: "Rp 85.000",
    color: "blue",
    size: "",
    coverImage: "/covers/ikigai.svg",
    coverStyle: "atomic",
  },
  {
    title: "Laskar Pelangi",
    author: "Andrea Hirata",
    category: "Fiksi",
    condition: "Bekas layak",
    type: "Dijual",
    price: "Rp 70.000",
    color: "sand",
    size: "",
    coverImage: "/covers/laskar-pelangi.svg",
    coverStyle: "creative",
  },
  {
    title: "Perempuan Berkalung Sorban",
    author: "Abidah El Khalieqy",
    category: "Sastra",
    condition: "Sangat baik",
    type: "Dijual",
    price: "Rp 80.000",
    color: "olive",
    size: "",
    coverImage: "/covers/perempuan-berkalung-sorban.svg",
    coverStyle: "philosophy",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="arrow-icon">
      <path d="M2.5 8h10M8.5 3.5 13 8l-4.5 4.5" />
    </svg>
  );
}

function BookCard({
  book,
}: {
  book: (typeof books)[number];
}) {
  return (
    <article className={`book-card ${book.color} ${book.size}`}>
      <div className="book-card__topline">
        <span>{book.category}</span>
        <span className="book-card__mark">↗</span>
      </div>
      <div
        className={`book-cover book-cover--${book.coverStyle}`}
      >
        <Image
          src={book.coverImage}
          alt={`Sampul buku ${book.title}`}
          fill
          sizes="(max-width: 700px) 42vw, 215px"
        />
      </div>
      <div className="book-card__details">
        <div>
          <h3>{book.title}</h3>
          <p>{book.author}</p>
        </div>
        <strong>{book.price}</strong>
      </div>
      <div className="book-card__footer">
        <span className="chip">{book.condition}</span>
        <span className="chip chip--dark">{book.type}</span>
      </div>
    </article>
  );
}

function Catalog() {
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [search, setSearch] = useState("");

  const categories = ["Semua", ...new Set(books.map((book) => book.category))];
  const filteredBooks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return books.filter((book) => {
      const matchesCategory =
        activeCategory === "Semua" || book.category === activeCategory;
      const matchesSearch =
        !keyword ||
        book.title.toLowerCase().includes(keyword) ||
        book.author.toLowerCase().includes(keyword);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  return (
    <section className="catalog section-shell" id="katalog">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Koleksi Baca Ulang</p>
          <h2>Temukan cerita baru.</h2>
        </div>
        <p className="catalog-count">
          {filteredBooks.length} dari {books.length} buku
        </p>
      </div>
      <div className="catalog-toolbar">
        <div className="catalog-filters" aria-label="Filter kategori buku">
          {categories.map((category) => (
            <button
              className={`catalog-filter ${
                activeCategory === category ? "is-active" : ""
              }`}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
        <label className="catalog-search">
          <span className="sr-only">Cari judul atau penulis</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari judul atau penulis..."
            type="search"
            value={search}
          />
          <span aria-hidden="true">⌕</span>
        </label>
      </div>
      {filteredBooks.length > 0 ? (
        <div className="bento-grid">
          {filteredBooks.map((book) => (
            <BookCard key={book.title} book={book} />
          ))}
          <div className="catalog-note" id="cara-kerja">
            <span className="catalog-note__number">04</span>
            <p>
              Punya buku yang ingin
              <br />
              <strong>melanjutkan perjalanan?</strong>
            </p>
            <a className="round-link" href="#katalog" aria-label="Jual buku">
              <ArrowIcon />
            </a>
          </div>
        </div>
      ) : (
        <div className="catalog-empty">
          <strong>Buku tidak ditemukan.</strong>
          <p>Coba gunakan kata kunci atau kategori yang berbeda.</p>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <main>
      <nav className="site-nav" aria-label="Navigasi utama">
        <a className="brand" href="#">
          <span className="brand__symbol">B</span>
          <span>Baca Ulang</span>
        </a>
        <div className="nav-links">
          <a href="#katalog">Katalog</a>
          <a href="#cerita">Tentang kami</a>
          <a href="#cara-kerja">Cara kerja</a>
        </div>
        <div className="nav-actions">
          <a className="nav-login" href="/login">
            Login
          </a>
          <a className="nav-action" href="#katalog">
            Mulai menjelajah <ArrowIcon />
          </a>
        </div>
      </nav>

      <section className="hero section-shell">
        <div className="eyebrow">
          <span className="eyebrow__line" />
          Ruang untuk cerita berikutnya
        </div>
        <div className="hero__content">
          <h1>
            Buku yang baik
            <br />
            <em>layak dibaca ulang.</em>
          </h1>
          <div className="hero__aside">
            <p>
              Temukan, jual, dan tukarkan buku yang punya cerita. Sebuah ruang
              kecil untuk memperpanjang umur setiap halaman.
            </p>
            <a className="button button--dark" href="#katalog">
              Jelajahi katalog <ArrowIcon />
            </a>
          </div>
        </div>
        <div className="hero__bottom">
          <span>01 / 04</span>
          <span className="hero__rule" />
          <span>Temukan bacaanmu</span>
        </div>
      </section>

      <section className="intro section-shell" id="cerita">
        <p className="section-kicker">Lebih dari sekadar transaksi</p>
        <div className="intro__grid">
          <h2>
            Setiap buku punya
            <br />
            <span>kehidupan kedua.</span>
          </h2>
          <p>
            Kami percaya buku tidak pernah benar-benar selesai saat halaman
            terakhir ditutup. Di sini, buku berpindah tangan, menemukan ruang
            baru, dan kembali menemani pembaca berikutnya.
          </p>
        </div>
      </section>

      <Catalog />

      <section className="manifesto section-shell">
        <span className="manifesto__quote">“</span>
        <blockquote>
          Buku adalah cara paling sunyi untuk
          <br />
          <em>bertemu banyak kehidupan.</em>
        </blockquote>
        <p>— Baca Ulang, sejak 2024</p>
      </section>

      <footer className="site-footer section-shell">
        <div>
          <a className="brand" href="#">
            <span className="brand__symbol">B</span>
            <span>Baca Ulang</span>
          </a>
          <p>Perpanjang umur cerita.</p>
        </div>
        <div className="footer-links">
          <a href="#katalog">Instagram</a>
          <a href="#katalog">Kebijakan privasi</a>
          <span>© 2024 Baca Ulang</span>
        </div>
      </footer>
    </main>
  );
}
