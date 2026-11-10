"""Kiểm định z hai tỷ lệ cho thí nghiệm A/B, viết thuần Python để không phụ thuộc scipy."""
import math


def ztest_hai_ty_le(thanh_cong_a, tong_a, thanh_cong_b, tong_b):
    """Kiểm định hai phía H0: p_A = p_B với độ lệch chuẩn gộp.

    Trả về (z, p_value). Trả về (None, None) khi không đủ dữ liệu để tính.
    """
    if tong_a <= 0 or tong_b <= 0:
        return None, None
    p_a = float(thanh_cong_a) / tong_a
    p_b = float(thanh_cong_b) / tong_b
    p_gop = float(thanh_cong_a + thanh_cong_b) / (tong_a + tong_b)
    phuong_sai = p_gop * (1.0 - p_gop) * (1.0 / tong_a + 1.0 / tong_b)
    if phuong_sai <= 0.0:
        return None, None
    z = (p_b - p_a) / math.sqrt(phuong_sai)
    # P(|Z| > |z|) = erfc(|z| / sqrt(2))
    return z, math.erfc(abs(z) / math.sqrt(2.0))


def ket_luan(p_value, muc_y_nghia=0.05):
    """Diễn giải p-value thành câu kết luận hiển thị trên bảng điều khiển."""
    if p_value is None:
        return "Chưa đủ dữ liệu để kiểm định"
    if p_value < muc_y_nghia:
        return "Khác biệt có ý nghĩa thống kê (p < {})".format(muc_y_nghia)
    return "Chưa đủ bằng chứng về khác biệt (p >= {})".format(muc_y_nghia)


def co_mau_can_thiet(p_nen, muc_tang_tuong_doi, z_alpha=1.96, z_beta=0.8416):
    """Ước lượng số impression mỗi nhóm cần có (alpha 5%, power 80%)."""
    p_moi = p_nen * (1.0 + muc_tang_tuong_doi)
    hieu = p_moi - p_nen
    phuong_sai = p_nen * (1.0 - p_nen) + p_moi * (1.0 - p_moi)
    return int(math.ceil(((z_alpha + z_beta) ** 2) * phuong_sai / (hieu ** 2)))
