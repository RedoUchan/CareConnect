using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using web.Data;
using web.DTOs;
using web.Models;

namespace web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [ApiExplorerSettings(GroupName = "auth")]
    public class TestimonialsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TestimonialsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: /api/testimonials
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetTestimonials()
        {
            try
            {
                var testimonials = await _context.Testimonials
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => new
                    {
                        t.TestimonialId,
                        t.FullName,
                        t.RoleOrJob,
                        t.Rating,
                        t.Comment,
                        t.CreatedAt
                    })
                    .ToListAsync();

                return Ok(testimonials);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy danh sách đánh giá từ hệ thống.", details = ex.Message });
            }
        }

        // POST: /api/testimonials
        [HttpPost]
        [AllowAnonymous] // Cho phép cả khách vãng lai và người dùng đã đăng nhập đánh giá
        public async Task<IActionResult> SubmitTestimonial([FromBody] SubmitTestimonialRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Xác định UserId nếu người dùng đang đăng nhập
                int? loggedInUserId = null;
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                  ?? User.FindFirst("UserId")?.Value;
                if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userId))
                {
                    loggedInUserId = userId;
                }

                var testimonial = new Testimonial
                {
                    FullName = request.FullName.Trim(),
                    RoleOrJob = string.IsNullOrWhiteSpace(request.RoleOrJob) ? "Thành viên cộng đồng" : request.RoleOrJob.Trim(),
                    Rating = request.Rating,
                    Comment = request.Comment.Trim(),
                    UserId = loggedInUserId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Testimonials.Add(testimonial);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Gửi đánh giá thành công! Cảm ơn ý kiến đóng góp của bạn.",
                    testimonial = new
                    {
                        testimonial.TestimonialId,
                        testimonial.FullName,
                        testimonial.RoleOrJob,
                        testimonial.Rating,
                        testimonial.Comment,
                        testimonial.CreatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lưu đánh giá vào cơ sở dữ liệu.", details = ex.Message });
            }
        }
    }
}
