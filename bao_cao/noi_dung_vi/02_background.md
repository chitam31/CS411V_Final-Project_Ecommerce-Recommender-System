# Cơ sở lý thuyết {#sec:background}

Chương này tóm tắt các khái niệm mà hệ thống dựa vào. Đây không phải một bài tổng quan; mỗi mục chỉ giải thích những gì cần thiết để theo dõi các quyết định thiết kế ở các chương sau.

## Hệ thống gợi ý và phản hồi ngầm

Một hệ thống gợi ý ước lượng mức độ quan tâm của người dùng *u* đối với sản phẩm *i* và cho mỗi người dùng xem những sản phẩm có ước lượng cao nhất. Có hai họ phương pháp chính. Phương pháp *dựa trên nội dung* mô tả sản phẩm bằng thuộc tính và gợi ý những sản phẩm giống với những gì người dùng đã thích. *Lọc cộng tác* bỏ qua nội dung sản phẩm và chỉ học từ ma trận tương tác: những người dùng có hành vi giống nhau trong quá khứ được giả định sẽ thích các sản phẩm tương tự trong tương lai. Lọc cộng tác là lựa chọn tự nhiên ở đây vì thuộc tính sản phẩm của RetailRocket là các giá trị băm đã ẩn danh, trong khi nhật ký tương tác thì phong phú.

Phần lớn cửa hàng thực tế thu thập **phản hồi ngầm** (lượt xem trang, thêm vào giỏ, mua hàng) thay vì điểm đánh giá tường minh. Dữ liệu ngầm khác điểm đánh giá ở ba điểm quan trọng cho việc mô hình hóa [1]. Thứ nhất, không có tín hiệu âm: một sản phẩm người dùng chưa từng xem có thể là chưa biết chứ không phải không thích. Thứ hai, các con số thể hiện *độ tin cậy* chứ không phải *mức độ ưa thích*: xem một sản phẩm mười lần làm ta chắc chắn hơn rằng người dùng quan tâm, chứ không có nghĩa là họ thích nó gấp mười lần. Thứ ba, ma trận cực kỳ thưa; trong đồ án này ma trận huấn luyện có mật độ khoảng 1,8 × 10^{−5}.

Ba vấn đề nữa là đặc trưng của thương mại điện tử. **Khởi đầu lạnh** liên quan đến người dùng và sản phẩm chưa có đủ lịch sử cho lọc cộng tác; vấn đề này phải được xử lý bằng các chiến lược riêng như độ phổ biến trong danh mục hoặc những gì đang thịnh hành. **Thiên lệch độ phổ biến** [5] là xu hướng của mô hình cộng tác gợi ý cùng một nhóm sản phẩm phổ biến cho mọi người, vì sản phẩm phổ biến có vector học được mạnh nhất. **Bot và nhiễu** (trình thu thập sinh hàng nghìn sự kiện mỗi giờ, nhấp đúp và tải lại trang) làm méo cả độ phổ biến lẫn ma trận tương tác và phải được loại bỏ trước khi huấn luyện.

## Bình phương tối thiểu luân phiên cho phản hồi ngầm {#sec:bg-als}

Phân rã ma trận [3] biểu diễn mỗi người dùng bằng một vector *x_u* và mỗi sản phẩm bằng một vector *y_i* có số chiều *f* (gọi là *rank*), sao cho tích vô hướng *x_uᵀ y_i* xấp xỉ mức độ quan tâm của người dùng. Với phản hồi ngầm, Hu, Koren và Volinsky [1] tách mỗi quan sát *r_ui* (ở đây là điểm tương tác đã suy giảm theo thời gian) thành một mức ưa thích nhị phân và một mức độ tin cậy, như ở @eq:pref.

$$pref$$ {#eq:pref}

Mô hình được khớp trên **tất cả** các cặp người dùng – sản phẩm, kể cả các ô trống (với mức ưa thích 0 và độ tin cậy 1), bằng cách cực tiểu hóa @eq:als.

$$als$$ {#eq:als}

Vì tổng chạy qua mọi ô của ma trận, hạ gradient sẽ tốn kém quá mức. Bình phương tối thiểu luân phiên tận dụng một thực tế: khi cố định *Y*, hàm mục tiêu là hàm bậc hai theo từng *x_u* và có nghiệm dạng đóng; thuật toán luân phiên giữa việc giải cho mọi người dùng khi cố định sản phẩm và giải cho mọi sản phẩm khi cố định người dùng. Mỗi nửa bước tách thành các bài toán bình phương tối thiểu độc lập, được Spark MLlib phân tán trên cụm bằng cách chia người dùng và sản phẩm thành các khối. MLlib nhân số hạng điều chuẩn với số tương tác *n_u* và *n_i* (cách làm ALS-WR [2]), nhờ đó `regParam` ít nhạy với kích thước dữ liệu hơn.

Ba siêu tham số được tinh chỉnh trong đồ án có ý nghĩa rõ ràng. `rank` là số nhân tố ẩn và quyết định năng lực của mô hình. `regParam` (λ) phạt các nhân tố lớn và kiểm soát quá khớp. `alpha` quyết định một tương tác quan sát được đáng tin hơn một ô trống bao nhiêu: với α = 40, một lần mua (trọng số 5) cho độ tin cậy 201, so với 1 của một cặp không quan sát được. Các điểm *x_uᵀ y_i* chỉ dùng để xếp hạng; chúng không phải xác suất.

## Chỉ số đánh giá gợi ý Top-K {#sec:bg-metrics}

Đánh giá offline giấu đi các tương tác gần nhất, yêu cầu mô hình đưa ra danh sách top-*K* cho từng người dùng và kiểm tra xem danh sách khôi phục được bao nhiêu sản phẩm bị giấu. Gọi *R_K(u)* là danh sách top-*K* của người dùng *u*, *T(u)* là tập đáp án đúng (các sản phẩm người dùng đã tương tác trong kỳ kiểm tra) và *rel_j* = 1 nếu sản phẩm ở vị trí *j* thuộc *T(u)*. Precision và recall tại *K* được định nghĩa ở @eq:pr.

$$pr$$ {#eq:pr}

Precision và recall bỏ qua thứ tự trong danh sách. **NDCG@K** [4] thưởng cho các lần trúng ở gần đầu danh sách bằng một hệ số chiết khấu logarit và chuẩn hóa theo danh sách lý tưởng (@eq:ndcg), trong đó *IDCG@K* đặt min(|*T(u)*|, *K*) lần trúng vào các vị trí đầu tiên. **MAP@K** lấy trung bình precision tại mỗi vị trí trúng (@eq:map). Cả bốn chỉ số được lấy trung bình trên các người dùng có tập đáp án không rỗng; người dùng không nhận được gợi ý nào được tính điểm 0. Các định nghĩa khớp với `pyspark.mllib.evaluation.RankingMetrics`, và một kiểm thử đơn vị so sánh cách hiện thực của đồ án với cách hiện thực của Spark.

$$ndcg$$ {#eq:ndcg}

$$map$$ {#eq:map}

Chỉ riêng các chỉ số độ chính xác sẽ ưu ái độ phổ biến. Hai chỉ số nữa, cả hai đều do đề bài yêu cầu, đo độ đa dạng [6] (@eq:covnov). **Độ phủ** là tỉ lệ danh mục sản phẩm xuất hiện trong ít nhất một danh sách top-*K*. **Độ mới lạ** là lượng thông tin riêng trung bình của các sản phẩm được gợi ý, trong đó *n_i* là số người dùng huấn luyện đã tương tác với sản phẩm *i* và *N* là số người dùng huấn luyện: sản phẩm hiếm khi được xem mang nhiều thông tin hơn. Đồ án cũng báo cáo **phân bố độ phổ biến**: sản phẩm được chia thành mười nhóm bằng nhau theo độ phổ biến (N1 = 10 % phổ biến nhất), rồi đếm tỉ lệ ô gợi ý rơi vào mỗi nhóm. Nếu không có thiên lệch độ phổ biến, mỗi nhóm sẽ nhận khoảng 10 %.

$$covnov$$ {#eq:covnov}

## Lakehouse và Delta Lake {#sec:bg-delta}

Một *data lake* lưu tệp thô với chi phí thấp trên hệ thống tệp phân tán nhưng không có giao dịch: một job hỏng giữa chừng để lại tệp dở dang, các tiến trình ghi đồng thời làm hỏng dữ liệu của nhau, và không có cách nào cập nhật một dòng đơn lẻ. Một *kho dữ liệu* (data warehouse) có giao dịch nhưng đắt và không phù hợp cho học máy trên dữ liệu thô. **Lakehouse** [11] bổ sung một lớp siêu dữ liệu có giao dịch lên trên các tệp mở trong data lake. Đồ án theo cách tổ chức *medallion* phổ biến: **bronze** giữ sự kiện thô đúng như khi nhận, **silver** giữ dữ liệu đã làm sạch và chuẩn hóa, **gold** giữ các bảng ở mức nghiệp vụ, sẵn sàng phục vụ; một lớp **features** nằm giữa silver và mô hình.

**Delta Lake** [10] hiện thực lakehouse bằng các tệp dữ liệu Parquet cộng với một nhật ký giao dịch (`_delta_log`) gồm các tệp commit JSON. Mỗi lần ghi thêm một commit liệt kê các tệp được thêm và xóa; trình đọc dựng lại một ảnh chụp nhất quán bằng cách phát lại nhật ký, nên không bao giờ thấy một bảng đang ghi dở. Điều khiển tương tranh lạc quan giải quyết các tiến trình ghi đồng thời: mỗi giao dịch kiểm tra lúc commit xem có commit xung đột nào xảy ra kể từ khi nó bắt đầu không; nếu có, giao dịch thất bại với một `Concurrent…Exception` và phải thử lại. Các tính năng dùng trong đồ án gồm:

- **MERGE** (upsert): cập nhật các dòng khớp, chèn dòng mới và tùy chọn xóa các dòng khác trong một câu lệnh nguyên tử; dùng để cập nhật danh sách gợi ý của một người dùng mà không ghi lại toàn bộ bảng, và để upsert các kết quả tổng hợp của luồng.
- **Time travel**: `VERSION AS OF v` đọc bảng đúng như sau commit *v*, miễn là các tệp của phiên bản đó chưa bị dọn bởi VACUUM. Đây là nền tảng của khả năng tái lập.
- **Tiến hóa lược đồ**: `ALTER TABLE ADD COLUMNS` thêm cột mà không ghi lại dữ liệu; các phiên bản cũ vẫn đọc được với lược đồ ban đầu.
- **Change Data Feed (CDF)**: khi bật, Delta ghi lại các thay đổi ở mức dòng, nhờ đó một job phía sau chỉ cần đọc những dòng được chèn hoặc cập nhật kể từ một phiên bản cho trước.
- **OPTIMIZE** gộp các tệp nhỏ; **Z-ORDER BY** còn gom các dòng theo một hoặc nhiều cột dọc theo một đường cong lấp đầy không gian, để thống kê min/max của mỗi tệp chỉ phủ một khoảng hẹp và cơ chế bỏ qua dữ liệu (data skipping) có thể bỏ qua phần lớn tệp với một điều kiện lọc chọn lọc.
- **VACUUM** xóa các tệp không còn được các phiên bản gần đây tham chiếu; thời gian lưu giữ của nó giới hạn time travel có thể quay về bao xa.
- **Phân vùng** chia bảng thành các thư mục theo một cột có ít giá trị phân biệt (ở đây là ngày của sự kiện), để các truy vấn lọc theo cột đó chỉ đọc những thư mục liên quan.

## Apache Spark và Structured Streaming {#sec:bg-spark}

**Spark** [8] là một bộ máy phân tán thực thi các chương trình song song dữ liệu. Một tiến trình *driver* dựng kế hoạch thực thi từ các phép toán DataFrame hoặc SQL, chia thành các stage và task, rồi lập lịch các task trên các *executor* chạy ở máy worker. Ở **chế độ standalone**, một Spark Master theo dõi các worker sẵn có và cấp executor cho các ứng dụng. Hai thiết lập quan trọng trên một cụm dùng chung: `spark.cores.max` giới hạn số lõi một ứng dụng được lấy (nếu không, ứng dụng đầu tiên sẽ chiếm toàn cụm), và `spark.executor.memory` phải vừa với bộ nhớ mà mỗi worker cung cấp, nếu không worker đó sẽ không nhận executor nào. Ứng dụng PySpark trên cụm standalone chỉ chạy được ở *chế độ client*, khi đó driver nằm trên máy nộp job; điều này đặt mọi driver của đồ án lên máy master (@sec:infra).

**Structured Streaming** [9] coi một luồng là một bảng không giới hạn và chạy cùng các phép toán DataFrame theo kiểu tăng dần trong các *micro-batch* được kích hoạt theo chu kỳ cố định. Một **checkpoint** trên bộ lưu trữ tin cậy ghi lại offset của nguồn và trạng thái toán tử của mỗi batch, nhờ đó một truy vấn khởi động lại sẽ tiếp tục đúng chỗ đã dừng. Với một nguồn phát lại được (Kafka) và một đích ghi lũy đẳng hoặc có giao dịch (Delta, hoặc đích tệp Parquet với nhật ký `_spark_metadata`), kết quả đầu cuối là chính xác một lần (exactly-once). **Cửa sổ theo thời gian sự kiện** gom các bản ghi theo một cột thời gian vào các cửa sổ cố định hoặc trượt; một **watermark** khai báo dữ liệu được phép đến trễ bao lâu, sau đó trạng thái của các cửa sổ cũ bị bỏ. **Chế độ xuất** quyết định mỗi batch phát ra gì: `update` chỉ phát các cửa sổ bị batch đó thay đổi, phù hợp với việc upsert vào một bảng Delta qua `foreachBatch` và MERGE.

## Apache Kafka

**Kafka** [12] là một nhật ký commit phân tán, chia phân vùng và có nhân bản. Producer ghi nối bản ghi vào các *topic*; mỗi topic được chia thành các phân vùng, và các bản ghi cùng khóa đi vào cùng một phân vùng, giữ nguyên thứ tự. Consumer đọc theo nhịp riêng bằng cách theo dõi offset, nghĩa là nhiều consumer độc lập (ở đây là ba job luồng) có thể đọc cùng một topic mà không ảnh hưởng nhau, và một consumer có thể phát lại lịch sử từ bất kỳ offset nào. Kafka 3.7 chạy ở chế độ **KRaft**, trong đó một nhóm đồng thuận Raft tích hợp thay thế ZooKeeper để quản lý siêu dữ liệu. Trong đồ án, Kafka tách các producer (công cụ phát lại và ứng dụng web) khỏi các job xử lý: ứng dụng web không bao giờ ghi trực tiếp vào Delta, nhờ vậy tránh được mỗi cú nhấp sinh ra một commit và một tệp nhỏ.

## Hệ thống tệp phân tán Hadoop

**HDFS** [13] lưu tệp thành các khối lớn (mặc định 128 MB) được nhân bản trên nhiều **DataNode**, trong khi một **NameNode** duy nhất giữ không gian tên và vị trí các khối trong bộ nhớ. Client hỏi NameNode khối nằm ở đâu rồi đọc hoặc ghi trực tiếp với các DataNode. Hai đặc điểm định hình thiết kế. Thứ nhất, NameNode tốn khoảng 150 byte heap cho mỗi tệp, thư mục và khối, nên hàng triệu tệp nhỏ sẽ làm cạn bộ nhớ của nó và làm chậm mọi thao tác liệt kê; đây là "vấn đề tệp nhỏ" dẫn đến lựa chọn phân vùng theo ngày thay vì theo người dùng (@sec:data-model). Thứ hai, hệ số nhân bản quyết định dữ liệu chịu được bao nhiêu máy hỏng: với hệ số 1, mất hoặc treo một DataNode làm các khối của nó không đọc được, như đồ án đã gặp (@sec:issues).

## Điều phối luồng công việc với Apache Airflow

**Airflow** mô tả luồng công việc dưới dạng DAG các task định nghĩa bằng Python, có quan hệ phụ thuộc, lịch chạy (biểu thức cron), số lần thử lại và thời gian chờ tối đa. Bộ lập lịch tạo các *lượt chạy DAG* cho mỗi chu kỳ và giao các task sẵn sàng cho một executor; `LocalExecutor` chạy chúng như các tiến trình trên cùng máy. *Sensor* chờ một điều kiện bên ngoài; ở chế độ `reschedule`, sensor nhả ô worker giữa các lần kiểm tra. `BranchPythonOperator` chọn nhánh nào sẽ chạy tiếp, và các task trao đổi giá trị nhỏ qua **XCom**. *Pool* giới hạn số task chạy cùng lúc. Airflow 3, phiên bản dùng ở đây, tách máy chủ thành API server, scheduler, DAG processor và triggerer (tùy chọn), và các tiến trình task giao tiếp với API server qua một execution API.

## Thử nghiệm trực tuyến có đối chứng {#sec:bg-ab}

Một **thử nghiệm A/B** [7] phân ngẫu nhiên các đơn vị (ở đây là người dùng) vào nhóm đối chứng A và nhóm can thiệp B rồi so sánh một chỉ số kết quả. Việc phân nhóm phải **ổn định**, tức một người dùng luôn rơi vào cùng một nhóm, và điều này đạt được bằng cách băm mã người dùng. Với một kết quả nhị phân như nhấp trên mỗi lượt hiển thị, **kiểm định z hai tỉ lệ** so sánh tỉ lệ quan sát của hai nhóm với phương sai gộp (@eq:z); p-value là xác suất có một chênh lệch ít nhất lớn như vậy nếu tỉ lệ thật của hai nhóm bằng nhau.

$$z$$ {#eq:z}

**Cỡ mẫu** cần cho mỗi nhóm để phát hiện thay đổi từ *p₁* sang *p₂* với mức ý nghĩa α và độ mạnh 1 − β cho bởi @eq:n. Có hai cạm bẫy liên quan. Các lượt hiển thị của cùng một người dùng không độc lập, nên kiểm định ở mức lượt hiển thị có thể cho p-value nhỏ hơn thực tế; và việc kiểm định lặp lại mỗi ngày cho đến khi xuất hiện kết quả có ý nghĩa ("nhìn trộm") làm tăng tỉ lệ dương tính giả. Vì vậy đồ án định nghĩa kiểm định gộp trên toàn bộ thời kỳ là phân tích chính và chỉ dùng giá trị theo ngày để theo dõi (@sec:res-ab).

$$n$$ {#eq:n}
