package com.lucy.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequestDTO(
        @Email @Size(max = 180) String email,
        @NotBlank @Size(max = 120) String displayName,
        @Size(max = 40)
        @Pattern(regexp = "^$|^[+0-9][-0-9 .()]{6,39}$", message = "Phone number format is invalid")
        String phoneNumber,
        @Size(max = 240) String learningLanguages,
        @Size(max = 240) String teachingLanguages,
        @Size(max = 1000) String certificates,
        @Size(max = 1000) String achievements,
        @Size(max = 160) String brandName,
        @Size(max = 300)
        @Pattern(regexp = "^$|^https://(www\\.)?facebook\\.com/.+", message = "Facebook URL must start with https://facebook.com/")
        String facebookUrl,
        @Size(max = 300)
        @Pattern(regexp = "^$|^https://((www\\.)?youtube\\.com|youtu\\.be)/.+", message = "YouTube URL must start with https://youtube.com/ or https://youtu.be/")
        String youtubeUrl,
        @Size(max = 1200) String bio
) {
}
