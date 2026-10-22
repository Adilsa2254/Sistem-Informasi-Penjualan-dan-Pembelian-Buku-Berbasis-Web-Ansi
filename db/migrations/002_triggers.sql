CREATE FUNCTION fn_hitung_ulang_total(p_id_pembelian INT) RETURNS VOID AS $$
BEGIN
    UPDATE pembelian
       SET total = COALESCE((SELECT SUM(subtotal) FROM penjualan WHERE id_pembelian = p_id_pembelian), 0)
     WHERE id_pembelian = p_id_pembelian;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_penjualan_before_insert() RETURNS TRIGGER AS $$
DECLARE
    v_harga NUMERIC(12,2);
    v_stok  INT;
BEGIN
    SELECT harga, stok INTO v_harga, v_stok
      FROM buku WHERE id_buku = NEW.id_buku FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Buku dengan id % tidak ditemukan', NEW.id_buku;
    END IF;

    IF v_stok < NEW.quantity THEN
        RAISE EXCEPTION 'Stok buku id % tidak cukup (tersedia %, diminta %)',
            NEW.id_buku, v_stok, NEW.quantity;
    END IF;

    IF NEW.harga_satuan IS NULL THEN
        NEW.harga_satuan := v_harga;
    END IF;

    UPDATE buku SET stok = stok - NEW.quantity WHERE id_buku = NEW.id_buku;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_penjualan_after_change() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM fn_hitung_ulang_total(NEW.id_pembelian);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE buku SET stok = stok + OLD.quantity WHERE id_buku = OLD.id_buku;
        PERFORM fn_hitung_ulang_total(OLD.id_pembelian);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_penjualan_block_update() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Baris penjualan tidak boleh diubah. Hapus lalu buat ulang.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_penjualan_before_insert
    BEFORE INSERT ON penjualan
    FOR EACH ROW EXECUTE FUNCTION fn_penjualan_before_insert();

CREATE TRIGGER trg_penjualan_after_change
    AFTER INSERT OR DELETE ON penjualan
    FOR EACH ROW EXECUTE FUNCTION fn_penjualan_after_change();

CREATE TRIGGER trg_penjualan_block_update
    BEFORE UPDATE ON penjualan
    FOR EACH ROW EXECUTE FUNCTION fn_penjualan_block_update();
