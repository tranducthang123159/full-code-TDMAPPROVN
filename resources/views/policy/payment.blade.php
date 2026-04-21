@extends('layouts.policy', [
    'title' => 'Thanh toán và kích hoạt',
    'heroTitle' => 'Chính sách thanh toán và kích hoạt tài khoản',
    'heroDesc' => 'Quy định về phương thức thanh toán, xác nhận giao dịch, kích hoạt gói dịch vụ và xử lý các vấn đề phát sinh.'
])

@section('content')
    <h2>Chính sách thanh toán và kích hoạt tài khoản</h2>

    <p>
        Chính sách này quy định cách thức người dùng thanh toán cho các gói dịch vụ, thời gian xử lý kích hoạt, trách nhiệm của các bên và nguyên tắc giải quyết trong trường hợp phát sinh sai sót hoặc chậm xác nhận.
    </p>

    <h3>1. Phạm vi áp dụng</h3>
    <p>
        Chính sách này áp dụng đối với các giao dịch đăng ký mới, gia hạn hoặc nâng cấp gói dịch vụ trên website. Người dùng cần đọc kỹ thông tin gói dịch vụ, thời hạn sử dụng và phạm vi tính năng trước khi thực hiện thanh toán.
    </p>

    <h3>2. Phương thức thanh toán</h3>
    <p>Người dùng có thể thanh toán thông qua các phương thức được website hỗ trợ tại từng thời điểm, bao gồm:</p>
    <ul>
        <li>Chuyển khoản ngân hàng.</li>
        <li>Quét mã thanh toán.</li>
        <li>Các phương thức thanh toán điện tử hợp lệ khác nếu được hệ thống tích hợp.</li>
    </ul>

    <h3>3. Quy trình kích hoạt</h3>
    <ol>
        <li>Người dùng lựa chọn gói dịch vụ phù hợp.</li>
        <li>Hệ thống hiển thị thông tin thanh toán hoặc tạo yêu cầu giao dịch.</li>
        <li>Người dùng hoàn tất thanh toán theo hướng dẫn.</li>
        <li>Hệ thống hoặc bộ phận quản trị kiểm tra và xác nhận giao dịch.</li>
        <li>Tài khoản được kích hoạt hoặc nâng cấp theo đúng gói đã đăng ký.</li>
    </ol>

    <div class="policy-success">
        Trong điều kiện bình thường, việc kích hoạt sẽ được xử lý trong thời gian sớm nhất sau khi giao dịch được xác nhận hợp lệ.
    </div>

    <h3>4. Trách nhiệm của người dùng khi thanh toán</h3>
    <ul>
        <li>Nhập đúng nội dung chuyển khoản hoặc thông tin định danh giao dịch nếu hệ thống có yêu cầu.</li>
        <li>Kiểm tra kỹ số tiền, gói dịch vụ và thời hạn sử dụng trước khi thanh toán.</li>
        <li>Giữ lại bằng chứng giao dịch để phục vụ việc đối chiếu khi cần.</li>
        <li>Liên hệ ngay với bộ phận hỗ trợ nếu đã thanh toán nhưng chưa được kích hoạt đúng thời gian hợp lý.</li>
    </ul>

    <h3>5. Xử lý giao dịch lỗi hoặc chậm xác nhận</h3>
    <p>
        Trong một số trường hợp, giao dịch có thể bị chậm ghi nhận do sai nội dung chuyển khoản, lỗi kết nối, lỗi đối soát hoặc sai thông tin người nhận. Khi đó, người dùng cần cung cấp thông tin thanh toán để chúng tôi kiểm tra và hỗ trợ xử lý.
    </p>

    <table class="policy-table">
        <thead>
            <tr>
                <th>Tình huống</th>
                <th>Hướng xử lý</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Đã chuyển khoản nhưng chưa kích hoạt</td>
                <td>Người dùng gửi ảnh giao dịch, thời gian chuyển khoản và thông tin tài khoản để đối chiếu.</td>
            </tr>
            <tr>
                <td>Chuyển sai nội dung</td>
                <td>Hệ thống sẽ kiểm tra thủ công dựa trên số tiền, thời gian và tài khoản nhận tiền.</td>
            </tr>
            <tr>
                <td>Thanh toán sai gói</td>
                <td>Xem xét hỗ trợ điều chỉnh hoặc bù trừ theo chính sách tại thời điểm xử lý.</td>
            </tr>
            <tr>
                <td>Thanh toán trùng lặp</td>
                <td>Được kiểm tra và xử lý theo chính sách hoàn tiền hoặc quy đổi dịch vụ nếu phù hợp.</td>
            </tr>
        </tbody>
    </table>

    <h3>6. Hiệu lực kích hoạt</h3>
    <p>
        Gói dịch vụ có hiệu lực kể từ thời điểm tài khoản được hệ thống ghi nhận kích hoạt thành công hoặc từ thời điểm khác được thông báo rõ trong quá trình đăng ký. Thời hạn sử dụng sẽ được tính theo thông tin của từng gói dịch vụ.
    </p>

    <h3>7. Từ chối giao dịch</h3>
    <p>
        Chúng tôi có quyền từ chối kích hoạt hoặc từ chối cung cấp dịch vụ nếu phát hiện giao dịch gian lận, giả mạo, không rõ nguồn gốc hoặc có dấu hiệu vi phạm pháp luật.
    </p>

    <div class="policy-meta">
        Cập nhật lần cuối: {{ now()->format('d/m/Y') }}
    </div>
@endsection