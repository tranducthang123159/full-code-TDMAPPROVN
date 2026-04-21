@extends('layouts.policy', [
    'title' => 'Quy định sử dụng dữ liệu GIS',
    'heroTitle' => 'Quy định quản lý và sử dụng dữ liệu GIS',
    'heroDesc' => 'Nguyên tắc tải lên, xử lý, lưu trữ, chia sẻ và trách nhiệm pháp lý liên quan đến dữ liệu bản đồ chuyên ngành.'
])

@section('content')
    <h2>Quy định quản lý và sử dụng dữ liệu GIS</h2>

    <p>
        Trang này quy định nguyên tắc sử dụng đối với dữ liệu bản đồ, dữ liệu địa chính, quy hoạch, tọa độ VN2000, dữ liệu GPS và các lớp thông tin không gian khác được xử lý trên website.
    </p>

    <h3>1. Nguồn dữ liệu do người dùng cung cấp</h3>
    <p>
        Người dùng có thể tải lên các tệp dữ liệu phục vụ hiển thị, tra cứu hoặc phân tích kỹ thuật. Người dùng phải bảo đảm rằng mình có quyền hợp pháp đối với dữ liệu đó và việc tải lên không xâm phạm quyền của tổ chức, cá nhân khác.
    </p>

    <h3>2. Dữ liệu nền và dữ liệu của bên thứ ba</h3>
    <p>
        Một số lớp bản đồ nền, hình ảnh vệ tinh, dữ liệu định vị hoặc dịch vụ hỗ trợ có thể được cung cấp bởi đối tác hoặc nhà cung cấp dịch vụ bên thứ ba. Người dùng cần hiểu rằng các thành phần này có thể thay đổi, gián đoạn hoặc chịu sự điều chỉnh bởi điều khoản riêng của từng nhà cung cấp.
    </p>

    <h3>3. Tính chính xác của dữ liệu</h3>
    <p>
        Dữ liệu GIS trên hệ thống có thể chịu ảnh hưởng bởi nguồn dữ liệu đầu vào, hệ quy chiếu, sai số chuyển đổi tọa độ, sai số đo đạc thực địa, mức độ tổng quát hóa dữ liệu, hoặc các nguyên nhân kỹ thuật khác. Vì vậy, mọi dữ liệu hiển thị trên website cần được kiểm tra chéo trước khi sử dụng vào công việc chuyên môn hoặc pháp lý.
    </p>

    <h3>4. Hành vi bị cấm</h3>
    <ul>
        <li>Tải lên dữ liệu giả mạo, dữ liệu bị chỉnh sửa sai lệch nhằm gây hiểu nhầm hoặc gây thiệt hại cho bên khác.</li>
        <li>Phát tán công khai dữ liệu của người khác khi chưa được cho phép.</li>
        <li>Sử dụng website để khai thác hàng loạt dữ liệu trái phép, dò quét hệ thống hoặc trích xuất dữ liệu ngoài phạm vi sử dụng bình thường.</li>
        <li>Sử dụng dữ liệu từ website để thực hiện hành vi vi phạm pháp luật hoặc xâm phạm quyền tài sản, quyền riêng tư của tổ chức, cá nhân khác.</li>
    </ul>

    <h3>5. Phạm vi trách nhiệm</h3>
    <p>
        Website là công cụ hỗ trợ kỹ thuật. Người dùng tự chịu trách nhiệm trong việc kiểm tra tính hợp pháp của dữ liệu, đối chiếu kết quả với hồ sơ chính thức và bảo đảm mục đích sử dụng phù hợp quy định pháp luật hiện hành.
    </p>

    <div class="policy-note">
        Với các dữ liệu liên quan đến ranh giới hành chính, ranh giới thửa đất, diện tích pháp lý, chỉ giới quy hoạch, mốc tọa độ hoặc hiện trạng sử dụng đất, người dùng cần ưu tiên sử dụng tài liệu được cơ quan có thẩm quyền xác nhận khi phục vụ hồ sơ chính thức.
    </div>

    <h3>6. Xóa hoặc ngừng xử lý dữ liệu</h3>
    <p>
        Chúng tôi có quyền từ chối, ngừng xử lý hoặc xóa các dữ liệu tải lên nếu phát hiện dữ liệu vi phạm pháp luật, chứa mã độc, gây quá tải hệ thống hoặc phát sinh tranh chấp quyền sử dụng mà chưa được làm rõ.
    </p>

    <div class="policy-meta">
        Cập nhật lần cuối: {{ now()->format('d/m/Y') }}
    </div>
@endsection