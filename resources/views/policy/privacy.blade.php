@extends('layouts.policy', [
    'title' => 'Chính sách bảo mật',
    'heroTitle' => 'Chính sách bảo mật thông tin và dữ liệu GIS',
    'heroDesc' => 'Cam kết bảo vệ thông tin cá nhân, dữ liệu bản đồ, dữ liệu địa chính, dữ liệu quy hoạch và vị trí người dùng trong quá trình sử dụng dịch vụ.'
])

@section('content')
    <h2>Chính sách bảo mật thông tin và dữ liệu GIS</h2>

    <p>
        Chúng tôi cam kết tôn trọng và bảo vệ quyền riêng tư của người dùng khi sử dụng website và các công cụ hỗ trợ xử lý dữ liệu bản đồ chuyên ngành. Chính sách này giải thích cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân cũng như dữ liệu kỹ thuật do người dùng cung cấp trong quá trình sử dụng dịch vụ.
    </p>

    <div class="policy-note">
        Website hoạt động theo định hướng là công cụ hỗ trợ cá nhân trong việc xem, phân tích, hiển thị và xử lý dữ liệu bản đồ, không thay thế cho hồ sơ pháp lý hoặc tài liệu đo đạc chính thức do cơ quan có thẩm quyền ban hành.
    </div>

    <h3>1. Mục đích thu thập thông tin</h3>
    <p>Chúng tôi có thể thu thập một số nhóm thông tin cần thiết để vận hành website, quản lý tài khoản và hỗ trợ người dùng, bao gồm:</p>
    <ul>
        <li>Thông tin định danh cơ bản như họ tên, email, số điện thoại khi người dùng đăng ký tài khoản hoặc liên hệ hỗ trợ.</li>
        <li>Thông tin giao dịch khi người dùng đăng ký gói dịch vụ hoặc gửi yêu cầu kích hoạt tài khoản.</li>
        <li>Dữ liệu kỹ thuật do người dùng chủ động tải lên như tệp GeoJSON, SHP, ZIP hoặc các dữ liệu bản đồ tương đương để hiển thị và xử lý trên hệ thống.</li>
        <li>Dữ liệu vị trí GPS khi người dùng chủ động sử dụng các chức năng định vị, đo đạc hoặc xác định vị trí hiện tại trên bản đồ.</li>
        <li>Dữ liệu hệ thống như địa chỉ IP, loại thiết bị, trình duyệt, thời gian truy cập nhằm phục vụ bảo mật, ghi log lỗi và tối ưu hiệu suất.</li>
    </ul>

    <h3>2. Phạm vi sử dụng thông tin</h3>
    <p>Thông tin được thu thập chỉ được sử dụng trong các mục đích phù hợp với hoạt động của website, cụ thể như sau:</p>
    <ul>
        <li>Tạo và quản lý tài khoản người dùng.</li>
        <li>Xác thực đăng nhập, xác thực OTP hoặc kiểm tra tính hợp lệ của tài khoản.</li>
        <li>Tiếp nhận, xử lý và hiển thị dữ liệu bản đồ theo yêu cầu của người dùng.</li>
        <li>Hỗ trợ kỹ thuật, giải đáp khiếu nại, khắc phục lỗi hệ thống.</li>
        <li>Ghi nhận lịch sử thanh toán, kích hoạt hoặc gia hạn gói dịch vụ.</li>
        <li>Nâng cao tính ổn định, bảo mật và hiệu năng của nền tảng.</li>
    </ul>

    <h3>3. Cam kết bảo mật dữ liệu bản đồ và GIS</h3>
    <p>
        Chúng tôi hiểu rằng dữ liệu địa chính, quy hoạch, tọa độ và ranh giới thửa đất có thể là dữ liệu nhạy cảm hoặc có giá trị chuyên môn cao. Vì vậy, chúng tôi áp dụng nguyên tắc hạn chế truy cập, hạn chế chia sẻ và ưu tiên an toàn dữ liệu trong suốt quá trình vận hành.
    </p>

    <ul>
        <li>Không tự ý công khai dữ liệu bản đồ do người dùng tải lên.</li>
        <li>Không bán, trao đổi hoặc chuyển giao dữ liệu kỹ thuật của người dùng cho bên thứ ba nếu không có căn cứ pháp lý hoặc sự đồng ý của người dùng.</li>
        <li>Giới hạn quyền truy cập nội bộ đối với dữ liệu cần thiết để bảo trì hệ thống hoặc hỗ trợ kỹ thuật.</li>
        <li>Áp dụng các biện pháp kỹ thuật hợp lý để giảm thiểu rủi ro rò rỉ, mất mát hoặc truy cập trái phép.</li>
    </ul>

    <div class="policy-warning">
        Người dùng cần tự chịu trách nhiệm đối với nội dung dữ liệu tải lên, đặc biệt trong trường hợp dữ liệu chứa thông tin cá nhân, thông tin thửa đất, hồ sơ nội bộ hoặc các dữ liệu thuộc diện cần bảo mật theo quy định pháp luật.
    </div>

    <h3>4. Dữ liệu vị trí và GPS</h3>
    <p>
        Chức năng định vị chỉ được kích hoạt khi người dùng chủ động cho phép trình duyệt hoặc thiết bị truy cập vị trí. Dữ liệu vị trí được sử dụng nhằm hiển thị vị trí của người dùng trên bản đồ, hỗ trợ đo đạc thực địa, xác định hướng di chuyển hoặc phục vụ các chức năng kỹ thuật liên quan.
    </p>
    <p>
        Chúng tôi không khuyến khích người dùng chia sẻ công khai vị trí nhạy cảm và không cam kết lưu trữ lâu dài dữ liệu GPS trừ khi điều đó là cần thiết để thực hiện tính năng mà người dùng đã lựa chọn.
    </p>

    <h3>5. Lưu trữ và thời gian bảo quản dữ liệu</h3>
    <p>
        Dữ liệu được lưu trữ trong khoảng thời gian cần thiết để phục vụ mục đích vận hành hệ thống, quản lý tài khoản, hỗ trợ khách hàng hoặc theo yêu cầu của pháp luật. Sau thời gian này, dữ liệu có thể được xóa, ẩn, hoặc ngừng sử dụng tùy theo tính chất của từng loại dữ liệu.
    </p>

    <h3>6. Quyền của người dùng</h3>
    <p>Người dùng có quyền:</p>
    <ul>
        <li>Yêu cầu kiểm tra, chỉnh sửa hoặc cập nhật thông tin cá nhân của mình.</li>
        <li>Yêu cầu xóa tài khoản hoặc xóa dữ liệu cá nhân trong phạm vi phù hợp với quy định pháp luật và khả năng vận hành của hệ thống.</li>
        <li>Từ chối một số quyền truy cập như vị trí GPS, với điều kiện việc từ chối này có thể làm giới hạn một số tính năng của website.</li>
        <li>Liên hệ với chúng tôi để phản ánh các vấn đề liên quan đến quyền riêng tư hoặc an toàn thông tin.</li>
    </ul>

    <h3>7. Sửa đổi chính sách</h3>
    <p>
        Chính sách này có thể được cập nhật theo nhu cầu vận hành thực tế hoặc theo yêu cầu pháp lý. Nội dung cập nhật sẽ được công bố trên website. Người dùng nên kiểm tra định kỳ để nắm bắt phiên bản mới nhất.
    </p>

    <div class="policy-meta">
        Cập nhật lần cuối: {{ now()->format('d/m/Y') }}
    </div>
@endsection