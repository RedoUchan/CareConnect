import 'package:flutter/material.dart';

class PatientNewsTab extends StatelessWidget {
  final bool isLoadingNews;
  final List<dynamic> newsArticles;
  final Future<void> Function() onRefreshNews;

  const PatientNewsTab({
    Key? key,
    required this.isLoadingNews,
    required this.newsArticles,
    required this.onRefreshNews,
  }) : super(key: key);

  void _showNewsDetailBottomSheet(BuildContext context, dynamic item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.9,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            final hasImage = item['imageUrl'] != null && item['imageUrl'].toString().isNotEmpty;
            return SingleChildScrollView(
              controller: scrollController,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Pull handler line at top
                  Center(
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 12),
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  
                  // Header image
                  if (hasImage)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Image.network(
                          item['imageUrl'],
                          width: double.infinity,
                          height: 200,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            height: 200,
                            color: Colors.teal.shade50,
                            child: const Icon(Icons.broken_image, color: Colors.teal, size: 48),
                          ),
                        ),
                      ),
                    ),
                  
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (item['category'] != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.teal.shade50,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  item['category'],
                                  style: const TextStyle(
                                    color: Colors.teal,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            const Spacer(),
                            Text(
                              item['publishDate'] ?? 'Vừa xong',
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          item['title'] ?? '',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: Colors.teal,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.person_outline, size: 16, color: Colors.grey),
                            const SizedBox(width: 4),
                            Text(
                              item['author'] ?? 'Chuyên gia CareConnect',
                              style: const TextStyle(color: Colors.grey, fontSize: 12, fontStyle: FontStyle.italic),
                            ),
                          ],
                        ),
                        const Divider(height: 32),
                        Text(
                          item['content'] ?? (item['summary'] ?? ''),
                          style: const TextStyle(fontSize: 15, height: 1.5, color: Colors.black87),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return isLoadingNews
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: onRefreshNews,
            child: newsArticles.isEmpty
                ? const Center(child: Text("Hiện tại không có tin tức y tế nào mới.", style: TextStyle(color: Colors.grey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: newsArticles.length,
                    itemBuilder: (context, index) {
                      final item = newsArticles[index];
                      final hasImage = item['imageUrl'] != null && item['imageUrl'].toString().isNotEmpty;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 1.5,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => _showNewsDetailBottomSheet(context, item),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (hasImage)
                                ClipRRect(
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                  child: Image.network(
                                    item['imageUrl'],
                                    width: double.infinity,
                                    height: 160,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) => Container(
                                      height: 160,
                                      color: Colors.teal.shade50,
                                      child: const Center(child: Icon(Icons.image_not_supported_outlined, color: Colors.teal, size: 40)),
                                    ),
                                  ),
                                )
                              else
                                Container(
                                  height: 100,
                                  decoration: BoxDecoration(
                                    color: Colors.teal.shade50,
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                  ),
                                  child: const Center(child: Icon(Icons.newspaper_rounded, color: Colors.teal, size: 36)),
                                ),
                              Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        if (item['category'] != null)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(color: Colors.teal.shade50, borderRadius: BorderRadius.circular(4)),
                                            child: Text(
                                              item['category'],
                                              style: const TextStyle(color: Colors.teal, fontSize: 10, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        const Spacer(),
                                        Text(
                                          item['publishDate'] ?? 'Vừa xong',
                                          style: const TextStyle(color: Colors.grey, fontSize: 11),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      item['title'] ?? '',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.teal, height: 1.3),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      item['summary'] ?? '',
                                      style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.3),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const Divider(height: 24),
                                    Row(
                                      children: [
                                        const Icon(Icons.account_circle_outlined, color: Colors.grey, size: 16),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            item['author'] ?? 'Chuyên gia CareConnect',
                                            style: const TextStyle(color: Colors.grey, fontSize: 11, fontStyle: FontStyle.italic),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Text(
                                          "Đọc chi tiết",
                                          style: TextStyle(color: Colors.teal, fontWeight: FontWeight.bold, fontSize: 12),
                                        ),
                                        const Icon(Icons.chevron_right, color: Colors.teal, size: 16),
                                      ],
                                    )
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          );
  }
}
