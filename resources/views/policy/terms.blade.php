@extends('layouts.policy', [
    'title' => 'Điều khoản sử dụng',
    'heroTitle' => 'Điều khoản và điều kiện sử dụng dịch vụ',
    'heroDesc' => 'Quy định quyền, nghĩa vụ, trách nhiệm và giới hạn sử dụng đối với hệ thống bản đồ và công cụ xử lý dữ liệu GIS.'
])

@section('content')
    <h2>Điều khoản và điều kiện sử dụng</h2>

    <p>
        Khi truy cập hoặc sử dụng website, người dùng được xem là đã đọc, hiểu và đồng ý tuân thủ các điều khoản sử dụng dưới đây. Nếu không đồng ý với bất kỳ nội dung nào, người dùng nên ngừng sử dụng dịch vụ.
    </p>

    <h3>1. Phạm vi dịch vụ</h3>
    <p>
        Website cung cấp công cụ hỗ trợ xử lý, hiển thị, lưu trữ, quản lý và tra cứu dữ liệu bản đồ chuyên ngành, bao gồm nhưng không giới hạn ở dữ liệu địa chính, dữ liệu quy hoạch, tọa độ GPS, hiển thị lớp bản đồ, tìm kiếm thửa đất, đo khoảng cách, đo diện tích và một số chức năng kỹ thuật liên quan.
    </p>

    <h3>2. Tính chất tham khảo của kết quả</h3>
    <p>
        Mọi kết quả hiển thị, đo đạc, chuyển đổi tọa độ, tính diện tích, xuất dữ liệu hoặc phân tích trên website đều chỉ mang tính hỗ trợ kỹ thuật và tham khảo. Các kết quả này không có giá trị thay thế cho hồ sơ địa chính, bản đồ chính quy, sơ đồ kỹ thuật hoặc tài liệu pháp lý đã được cơ quan nhà nước có thẩm quyền xác nhận.
    </p>

    <div class="policy-warning">
        Người dùng không được sử dụng kết quả hiển thị trên website như một căn cứ pháp lý duy nhất để giải quyết tranh chấp, chuyển nhượng, cấp phép xây dựng hoặc xác lập quyền tài sản.
    </div>

    <h3>3. Nghĩa vụ của người dùng</h3>
    <ul>
        <li>Cung cấp thông tin đăng ký chính xác, trung thực và cập nhật khi có thay đổi.</li>
        <li>Chỉ tải lên các dữ liệu mà mình có quyền sử dụng hợp pháp.</li>
        <li>Không sử dụng website cho mục đích vi phạm pháp luật, xâm phạm quyền của tổ chức hoặc cá nhân khác.</li>
        <li>Không can thiệp, phá hoại, sao chép trái phép, dò quét lỗ hổng hoặc khai thác hệ thống theo cách gây ảnh hưởng đến hoạt động bình thường của website.</li>
        <li>Tự bảo mật thông tin tài khoản, mật khẩu và các phương thức xác thực của mình.</li>
    </ul>

    <h3>4. Quyền của đơn vị vận hành</h3>
    <ul>
        <li>Từ chối, tạm ngưng hoặc chấm dứt cung cấp dịch vụ đối với tài khoản vi phạm điều khoản sử dụng.</li>
        <li>Kiểm tra, rà soát, giới hạn hoặc xóa dữ liệu trong trường hợp cần thiết để bảo vệ hệ thống, tuân thủ pháp luật hoặc xử lý lỗi kỹ thuật.</li>
        <li>Thay đổi giao diện, cấu trúc chức năng, chính sách giá hoặc nội dung dịch vụ mà không cần báo trước trong mọi trường hợp, trừ khi pháp luật có quy định khác.</li>
    </ul>

    <h3>5. Dịch vụ của bên thứ ba</h3>
    <p>
        Website có thể tích hợp hoặc sử dụng dữ liệu nền, thư viện, API hoặc nền tảng của bên thứ ba như bản đồ nền, định vị, geocoding hoặc công nghệ hiển thị bản đồ. Việc sử dụng các thành phần đó đồng nghĩa người dùng cũng cần tuân thủ điều khoản của các nhà cung cấp tương ứng.
    </p>

    <h3>6. Giới hạn trách nhiệm</h3>
    <p>
        Chúng tôi không chịu trách nhiệm đối với thiệt hại phát sinh từ việc người dùng sử dụng dữ liệu sai mục đích, nhập dữ liệu sai, hiểu sai kết quả hiển thị, hoặc dùng kết quả kỹ thuật của website thay cho tài liệu pháp lý chính thức.
    </p>

    <h3>7. Chấm dứt sử dụng</h3>
    <p>
        Người dùng có thể ngừng sử dụng dịch vụ bất kỳ lúc nào. Chúng tôi có quyền tạm khóa hoặc chấm dứt tài khoản trong trường hợp phát hiện hành vi gian lận, lạm dụng tài nguyên, phát tán dữ liệu trái phép hoặc có dấu hiệu xâm phạm an ninh hệ thống.
    </p>

    <div class="policy-meta">
        Cập nhật lần cuối: {{ now()->format('d/m/Y') }}
    </div>
@endsection