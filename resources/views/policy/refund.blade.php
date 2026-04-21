@extends('layouts.policy', [
    'title' => 'Chính sách hoàn tiền',
    'heroTitle' => 'Chính sách hoàn tiền và xử lý giao dịch',
    'heroDesc' => 'Nguyên tắc xem xét hoàn phí, điều kiện áp dụng và quy trình xử lý khi phát sinh giao dịch cần đối soát.'
])

@section('content')
    <h2>Chính sách hoàn tiền</h2>

    <p>
        Chính sách này quy định các trường hợp có thể được xem xét hoàn tiền, giới hạn áp dụng, thời gian xử lý và phương thức hỗ trợ đối với giao dịch đã thanh toán cho website.
    </p>

    <h3>1. Nguyên tắc chung</h3>
    <p>
        Do dịch vụ là dịch vụ số, việc hoàn tiền sẽ được xem xét trên cơ sở thiện chí, tính hợp lệ của giao dịch, mức độ sử dụng dịch vụ và nguyên nhân phát sinh. Không phải mọi giao dịch đều mặc nhiên đủ điều kiện hoàn tiền.
    </p>

    <h3>2. Các trường hợp có thể xem xét hoàn tiền</h3>
    <ul>
        <li>Người dùng thanh toán trùng lặp do lỗi thao tác hoặc lỗi hệ thống.</li>
        <li>Người dùng bị trừ tiền nhưng không được kích hoạt dịch vụ và không thể khắc phục trong thời gian hợp lý.</li>
        <li>Hệ thống gặp lỗi nghiêm trọng kéo dài khiến dịch vụ không thể sử dụng được theo phạm vi chính đã cam kết.</li>
        <li>Giao dịch được xác nhận nhầm hoặc kích hoạt sai tài khoản mà không thể điều chỉnh hợp lý.</li>
    </ul>

    <h3>3. Các trường hợp không áp dụng hoàn tiền</h3>
    <ul>
        <li>Người dùng đã sử dụng phần lớn hoặc toàn bộ thời gian, dung lượng hoặc tính năng của gói dịch vụ.</li>
        <li>Người dùng thay đổi nhu cầu sử dụng sau khi tài khoản đã được kích hoạt đúng theo đăng ký.</li>
        <li>Người dùng không đọc kỹ mô tả tính năng, phạm vi dịch vụ hoặc yêu cầu kỹ thuật trước khi mua.</li>
        <li>Thiết bị, trình duyệt, mạng internet hoặc môi trường sử dụng của người dùng không tương thích nhưng không xuất phát từ lỗi hệ thống.</li>
        <li>Giao dịch vi phạm điều khoản sử dụng hoặc có dấu hiệu gian lận.</li>
    </ul>

    <div class="policy-warning">
        Trường hợp dữ liệu hoặc kết quả hiển thị không đáp ứng kỳ vọng chuyên môn cá nhân của người dùng nhưng vẫn nằm trong phạm vi tính năng đã mô tả thì không được xem là căn cứ bắt buộc để hoàn tiền.
    </div>

    <h3>4. Hồ sơ yêu cầu hoàn tiền</h3>
    <p>Khi cần yêu cầu hoàn tiền, người dùng nên cung cấp đầy đủ:</p>
    <ul>
        <li>Họ tên, email hoặc số điện thoại đăng ký tài khoản.</li>
        <li>Mã giao dịch hoặc bằng chứng thanh toán.</li>
        <li>Thời gian thanh toán.</li>
        <li>Lý do yêu cầu hoàn tiền.</li>
        <li>Thông tin tài khoản nhận hoàn tiền nếu được chấp thuận.</li>
    </ul>

    <h3>5. Thời gian xử lý</h3>
    <p>
        Chúng tôi sẽ tiếp nhận và phản hồi trong thời gian hợp lý kể từ khi nhận đủ thông tin cần thiết. Thời gian xử lý thực tế có thể phụ thuộc vào đối soát giao dịch, ngân hàng trung gian hoặc phương thức thanh toán mà người dùng đã sử dụng.
    </p>

    <h3>6. Hình thức hoàn tiền</h3>
    <p>
        Tùy từng trường hợp, việc hỗ trợ có thể được thực hiện bằng hoàn tiền, cộng thời gian sử dụng, đổi sang gói khác tương đương, hoặc cấp quyền sử dụng bổ sung phù hợp với mức độ ảnh hưởng thực tế.
    </p>

    <div class="policy-meta">
        Cập nhật lần cuối: {{ now()->format('d/m/Y') }}
    </div>
@endsection