using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class SetScheduleRequest
    {
        [Required]
        public DateTime AvailableDate { get; set; }

        [Required]
        public List<string> TimeSlots { get; set; } = new List<string>();
    }
}
