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
    cover: "CREATIVE\nACT",
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
    cover: "FILOSOFI\nTERAS",
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
    cover: "MIDNIGHT\nLIBRARY",
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
    cover: "ATOMIC\nHABITS",
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
      <div className="book-cover" aria-label={`Sampul ${book.title}`}>
        <span>{book.cover}</span>
        <small>EDISI PILIHAN</small>
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
        <a className="nav-action" href="#katalog">
          Mulai menjelajah <ArrowIcon />
        </a>
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

      <section className="catalog section-shell" id="katalog">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Pilihan minggu ini</p>
            <h2>Temukan cerita baru.</h2>
          </div>
          <a className="text-link" href="#katalog">
            Lihat semua buku <ArrowIcon />
          </a>
        </div>
        <div className="bento-grid">
          {books.map((book) => (
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
      </section>

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
