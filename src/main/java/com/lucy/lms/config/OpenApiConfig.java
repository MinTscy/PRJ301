package com.lucy.lms.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI lucyLmsOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("LUCY LMS Content API")
                        .description("API for importing multilingual docx learning materials and serving LMS content by language, stage, and level.")
                        .version("1.0.0"))
                .tags(List.of(
                        new Tag().name("Language API").description("Language lookup and language-scoped LMS content APIs."),
                        new Tag().name("Stage API").description("Stage lookup APIs."),
                        new Tag().name("Level API").description("Level lookup, level detail, and 100-level coverage APIs."),
                        new Tag().name("Import API").description("DOCX preview and import APIs for local LMS content ingestion."),
                        new Tag().name("Room API").description("Anonymous live room, pinned material, and timed LMS progression APIs.")
                ));
    }
}
