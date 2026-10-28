import 'package:flutter/material.dart';

class PatientAiChatTab extends StatelessWidget {
  final List<Map<String, dynamic>> chatMessages;
  final bool isAiTyping;
  final List<String> currentQuickReplies;
  final TextEditingController chatController;
  final Future<void> Function({String? customMessage}) onSendAiMessage;
  final VoidCallback onGoToBookingTab;

  const PatientAiChatTab({
    Key? key,
    required this.chatMessages,
    required this.isAiTyping,
    required this.currentQuickReplies,
    required this.chatController,
    required this.onSendAiMessage,
    required this.onGoToBookingTab,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16.0),
            itemCount: chatMessages.length,
            itemBuilder: (context, index) {
              final msg = chatMessages[index];
              final isAi = msg['sender'] == 'ai';
              final specialty = msg['suggestedSpecialty'];

              return Align(
                alignment: isAi ? Alignment.centerLeft : Alignment.centerRight,
                child: Column(
                  crossAxisAlignment: isAi ? CrossAxisAlignment.start : CrossAxisAlignment.end,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isAi ? Colors.grey.shade200 : Colors.teal.shade100,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(12),
                          topRight: const Radius.circular(12),
                          bottomLeft: isAi ? Radius.zero : const Radius.circular(12),
                          bottomRight: isAi ? const Radius.circular(12) : Radius.zero,
                        ),
                      ),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                      child: Text(
                        msg['text'] ?? '',
                        style: const TextStyle(fontSize: 14, height: 1.3),
                      ),
                    ),
                    if (isAi && specialty != null) ...[
                      Container(
                        margin: const EdgeInsets.only(bottom: 12, left: 4),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.orange.shade200),
                        ),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "💡 Chuyên khoa khuyên dùng: $specialty",
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange, fontSize: 13),
                            ),
                            const SizedBox(height: 6),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4)),
                              onPressed: onGoToBookingTab,
                              child: const Text("Đặt lịch hẹn ngay", style: TextStyle(color: Colors.white, fontSize: 11)),
                            )
                          ],
                        ),
                      )
                    ]
                  ],
                ),
              );
            },
          ),
        ),
        if (currentQuickReplies.isNotEmpty && !isAiTyping)
          Container(
            height: 38,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: currentQuickReplies.map((reply) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ActionChip(
                    backgroundColor: Colors.teal.shade50,
                    label: Text(reply, style: const TextStyle(color: Colors.teal, fontSize: 11)),
                    onPressed: () {
                      onSendAiMessage(customMessage: reply);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        if (isAiTyping)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              children: [
                const SizedBox(width: 8, height: 8, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.teal)),
                const SizedBox(width: 10),
                Text("Trợ lý AI đang soạn câu trả lời...", style: TextStyle(color: Colors.grey.shade600, fontSize: 12, fontStyle: FontStyle.italic)),
              ],
            ),
          ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: chatController,
                  decoration: const InputDecoration(
                    hintText: "Nhập tin nhắn với bác sĩ AI...",
                    border: InputBorder.none,
                  ),
                  onSubmitted: (_) => onSendAiMessage(),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.send, color: Colors.teal),
                onPressed: () => onSendAiMessage(),
              ),
            ],
          ),
        )
      ],
    );
  }
}
