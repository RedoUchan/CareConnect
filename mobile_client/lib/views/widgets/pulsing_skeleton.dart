import 'package:flutter/material.dart';

class PulsingSkeleton extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;

  const PulsingSkeleton({
    Key? key,
    required this.width,
    required this.height,
    this.borderRadius = 8.0,
  }) : super(key: key);

  @override
  State<PulsingSkeleton> createState() => _PulsingSkeletonState();
}

class _PulsingSkeletonState extends State<PulsingSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    
    _animation = Tween<double>(begin: 0.35, end: 0.75).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _animation,
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: Colors.grey.shade300,
          borderRadius: BorderRadius.circular(widget.borderRadius),
        ),
      ),
    );
  }
}

// Lớp tiện ích hiển thị 1 dòng ListTile giả lập đang tải
class SkeletonListTile extends StatelessWidget {
  const SkeletonListTile({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Row(
        children: [
          const PulsingSkeleton(width: 48, height: 48, borderRadius: 24), // Circle Avatar
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const PulsingSkeleton(width: 120, height: 16),
                const SizedBox(height: 8),
                PulsingSkeleton(width: MediaQuery.of(context).size.width * 0.5, height: 12),
              ],
            ),
          ),
          const SizedBox(width: 16),
          const PulsingSkeleton(width: 40, height: 16),
        ],
      ),
    );
  }
}

// Lớp tiện ích hiển thị 1 thẻ Card giả lập đang tải (Ví dụ cho bệnh án)
class SkeletonCard extends StatelessWidget {
  const SkeletonCard({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                PulsingSkeleton(width: 150, height: 16),
                PulsingSkeleton(width: 80, height: 12),
              ],
            ),
            const Divider(height: 24),
            const SizedBox(height: 4),
            const Row(
              children: [
                PulsingSkeleton(width: 60, height: 16),
                SizedBox(width: 8),
                PulsingSkeleton(width: 50, height: 16),
                SizedBox(width: 8),
                PulsingSkeleton(width: 50, height: 16),
              ],
            ),
            const SizedBox(height: 16),
            const PulsingSkeleton(width: 100, height: 12),
            const SizedBox(height: 8),
            PulsingSkeleton(width: double.infinity, height: 14),
            const SizedBox(height: 12),
            const PulsingSkeleton(width: 100, height: 12),
            const SizedBox(height: 8),
            PulsingSkeleton(width: double.infinity, height: 14),
          ],
        ),
      ),
    );
  }
}
