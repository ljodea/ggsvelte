#!/usr/bin/env Rscript

library(ggplot2)

rows <- data.frame(
  exposure = c(1, 2, 5, 10, 20, 50, 100, 200, 500, 1000),
  response = c(2.2, 2.1, 2.4, 2.2, 2.5, 2.8, 3.1, 4.2, 7.1, 12.3)
)

plot <- ggplot(rows, aes(exposure, response)) +
  geom_point(size = 3) +
  geom_smooth(method = "lm", se = FALSE) +
  coord_transform(x = "log10") +
  labs(
    title = "Post-stat coordinate transform",
    subtitle = "The linear fit is computed before the x coordinate is projected",
    x = "Exposure (log10 coordinate)",
    y = "Response"
  ) +
  theme_minimal(base_size = 12)

ggsave(
  "artifacts/scale-equivalence/pr4-coord-transform/ggplot2-reference.png",
  plot,
  width = 8,
  height = 4.8,
  dpi = 150
)
