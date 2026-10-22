CREATE FUNCTION fn_buat_transaksi(
    p_id_pelanggan INT,
    p_id_admin     INT,
    p_items        JSONB
) RETURNS TABLE (out_id_pembelian INT, out_no_transaksi VARCHAR, out_total NUMERIC) AS $$
DECLARE
    v_id  INT;
    v_no  VARCHAR(30);
    v_tgl DATE := (now() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Item transaksi tidak boleh kosong';
    END IF;

    v_no := 'TRX-' || to_char(v_tgl, 'YYYYMMDD') || '-' || lpad(nextval('seq_no_transaksi')::text, 6, '0');

    INSERT INTO pembelian (no_transaksi, tgl_pembelian, id_pelanggan)
    VALUES (v_no, v_tgl, p_id_pelanggan)
    RETURNING pembelian.id_pembelian INTO v_id;

    INSERT INTO penjualan (id_pembelian, id_buku, id_admin, quantity)
    SELECT v_id, (i->>'id_buku')::INT, p_id_admin, (i->>'quantity')::INT
      FROM jsonb_array_elements(p_items) AS i;

    RETURN QUERY
    SELECT p.id_pembelian, p.no_transaksi, p.total
      FROM pembelian p
     WHERE p.id_pembelian = v_id;
END;
$$ LANGUAGE plpgsql;
