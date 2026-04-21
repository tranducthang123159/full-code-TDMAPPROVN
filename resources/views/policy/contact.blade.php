@extends('layouts.policy', [
    'title' => 'Liên hệ và hỗ trợ',
    'heroTitle' => 'Liên hệ, hỗ trợ và tiếp nhận phản hồi',
    'heroDesc' => 'Kênh tiếp nhận thắc mắc, hỗ trợ kỹ thuật, xử lý tài khoản, dữ liệu và các yêu cầu liên quan đến dịch vụ.'
])

@section('content')
    <h2>Liên hệ, hỗ trợ và tiếp nhận phản hồi</h2>

    <p>
        Chúng tôi luôn cố gắng hỗ trợ người dùng trong quá trình đăng ký tài khoản, tải dữ liệu bản đồ, sử dụng công cụ GIS, xác nhận thanh toán và xử lý các vấn đề kỹ thuật phát sinh.
    </p>

    <h3>1. Nội dung hỗ trợ</h3>
    <ul>
        <li>Hỗ trợ đăng ký và kích hoạt tài khoản.</li>
        <li>Hỗ trợ sử dụng các chức năng bản đồ, đo đạc, tìm kiếm, hiển thị lớp dữ liệu.</li>
        <li>Hỗ trợ kiểm tra lỗi tải tệp, lỗi hiển thị dữ liệu hoặc lỗi hệ thống.</li>
        <li>Tiếp nhận yêu cầu điều chỉnh thông tin cá nhân hoặc yêu cầu xử lý dữ liệu.</li>
        <li>Tiếp nhận phản ánh, góp ý và khiếu nại liên quan đến dịch vụ.</li>
    </ul>

    <h3>2. Thông tin liên hệ</h3>
    <table class="policy-table">
        <tbody>
            <tr>
                <th>Chủ sở hữu / Đơn vị vận hành</th>
                <td>Nguyễn Thành Tài</td>
            </tr>
            <tr>
                <th>Email</th>
                <td>your@email.com</td>
            </tr>
            <tr>
                <th>Điện thoại</th>
                <td>0900 000 000</td>
            </tr>
            <tr>
                <th>Địa chỉ</th>
                <td>Điền địa chỉ của bạn tại Đắk Lắk</td>
            </tr>
            <tr>
                <th>Thời gian tiếp nhận</th>
                <td>Từ thứ 2 đến thứ 7, trong giờ hành chính hoặc theo thông báo thực tế của website</td>
            </tr>
        </tbody>
    </table>

    <h3>3. Thời gian phản hồi</h3>
    <p>
        Chúng tôi sẽ cố gắng phản hồi trong thời gian sớm nhất kể từ khi tiếp nhận đầy đủ thông tin. Đối với các trường hợp cần xác minh kỹ thuật, đối soát thanh toán hoặc kiểm tra dữ liệu chuyên môn, thời gian phản hồi có thể kéo dài hơn.
    </p>

    <h3>4. Lưu ý khi gửi yêu cầu hỗ trợ</h3>
    <ul>
        <li>Nêu rõ vấn đề đang gặp phải.</li>
        <li>Cung cấp email hoặc số điện thoại đã đăng ký.</li>
        <li>Đính kèm ảnh chụp màn hình nếu có lỗi hiển thị hoặc lỗi thao tác.</li>
        <li>Nếu liên quan thanh toán, vui lòng gửi kèm bằng chứng giao dịch.</li>
    </ul>

    <div class="policy-success">
        Việc cung cấp thông tin đầy đủ ngay từ đầu sẽ giúp quá trình hỗ trợ nhanh hơn và chính xác hơn.
    </div>

    <div class="policy-meta">
        Cập nhật lần cuối: {{ now()->format('d/m/Y') }}
    </div>
@endsection