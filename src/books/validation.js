// Kiểm tra form sách (Flow 2b). Hàm thuần, không đụng DOM.

export const LIMITS = {
  title: 200,
  author: 100,
  genre: 50,
  yearMin: 1000,
  quantityMin: 1,
  quantityMax: 1000,
};

// Trùng với CHECK isbn trong CSDL (ISBN-10 cho phép X ở cuối)
const ISBN_PATTERN = /^([0-9]{9}[0-9X]|[0-9]{13})$/;
const INTEGER_PATTERN = /^-?[0-9]+$/;

export function normalizeIsbn(value) {
  return String(value ?? '').replace(/[\s-]/g, '').toUpperCase();
}

export function quantityBelowBorrowedMessage(borrowed) {
  return `Đang có ${borrowed} cuốn được mượn, số lượng không được nhỏ hơn ${borrowed}`;
}

function checkText(raw, max, { empty, tooLong }) {
  const value = String(raw ?? '').trim();
  if (!value) return { value, error: empty };
  if ([...value].length > max) return { value, error: tooLong };
  return { value };
}

// raw: giá trị thô từ form. minQuantity: số cuốn đang cho mượn khi sửa (0 khi thêm).
// values dùng tên cột CSDL và chỉ có nghĩa khi errors rỗng.
export function validateBook(raw, { currentYear, minQuantity = 0 }) {
  const errors = {};

  const title = checkText(raw.ten_sach, LIMITS.title, {
    empty: 'Vui lòng nhập tên sách',
    tooLong: `Tên sách tối đa ${LIMITS.title} ký tự`,
  });
  const author = checkText(raw.tac_gia, LIMITS.author, {
    empty: 'Vui lòng nhập tác giả',
    tooLong: `Tác giả tối đa ${LIMITS.author} ký tự`,
  });
  const genre = checkText(raw.the_loai, LIMITS.genre, {
    empty: 'Vui lòng nhập thể loại',
    tooLong: `Thể loại tối đa ${LIMITS.genre} ký tự`,
  });
  if (title.error) errors.ten_sach = title.error;
  if (author.error) errors.tac_gia = author.error;
  if (genre.error) errors.the_loai = genre.error;

  const isbnText = normalizeIsbn(raw.isbn);
  const isbn = isbnText || null;
  if (isbn && !ISBN_PATTERN.test(isbn)) errors.isbn = 'ISBN phải gồm 10 hoặc 13 chữ số';

  const yearText = String(raw.nam_xuat_ban ?? '').trim();
  let year = null;
  if (yearText) {
    if (!INTEGER_PATTERN.test(yearText)) {
      errors.nam_xuat_ban = 'Năm xuất bản phải là số nguyên';
    } else {
      year = Number(yearText);
      if (year < LIMITS.yearMin || year > currentYear) {
        errors.nam_xuat_ban = `Năm xuất bản từ ${LIMITS.yearMin} đến năm hiện tại`;
      }
    }
  }

  const quantityText = String(raw.so_luong ?? '').trim();
  let quantity = null;
  if (!quantityText) {
    errors.so_luong = 'Vui lòng nhập số lượng';
  } else if (!INTEGER_PATTERN.test(quantityText)) {
    errors.so_luong = 'Số lượng phải là số nguyên';
  } else {
    quantity = Number(quantityText);
    if (quantity < LIMITS.quantityMin || quantity > LIMITS.quantityMax) {
      errors.so_luong = `Số lượng từ ${LIMITS.quantityMin} đến ${LIMITS.quantityMax}`;
    } else if (quantity < minQuantity) {
      errors.so_luong = quantityBelowBorrowedMessage(minQuantity);
    }
  }

  return {
    values: {
      ten_sach: title.value,
      tac_gia: author.value,
      the_loai: genre.value,
      isbn,
      nam_xuat_ban: year,
      so_luong: quantity,
    },
    errors,
  };
}
