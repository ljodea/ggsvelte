suppressPackageStartupMessages(library(ggplot2))
suppressPackageStartupMessages(library(jsonlite))
rows <- data.frame(
  dose = c(1,1.47,2.15,3.16,4.64,6.81,10,14.68,21.54,31.62,46.42,68.13,100,146.78,215.44,316.23,464.16,681.29,1000,1467.8),
  response = c(4.8,5.33,5.87,5.8,6.33,6.87,6.8,7.33,7.87,7.8,8.33,8.87,8.8,9.33,9.87,9.8,10.33,10.87,10.8,11.33)
)
p <- ggplot(rows, aes(dose, response)) +
  geom_smooth(method = "lm", se = FALSE) +
  geom_histogram(binwidth = 0.5, boundary = 0, inherit.aes = FALSE, mapping = aes(x = dose, y = after_stat(count)), alpha = 0.25) +
  geom_density(inherit.aes = FALSE, mapping = aes(x = dose, y = after_stat(density))) +
  scale_x_log10() + theme_minimal(base_size = 11)
b <- ggplot_build(p)
summary <- list(
  ggplot2Version = as.character(packageVersion("ggplot2")),
  smooth = b$data[[1]][, intersect(c("x","y","ymin","ymax"), names(b$data[[1]]))],
  histogram = b$data[[2]][, intersect(c("x","xmin","xmax","count","density"), names(b$data[[2]]))],
  density = head(b$data[[3]][, intersect(c("x","density","count","scaled"), names(b$data[[3]]))], 20),
  note = "ggplot2 scale_x_log10 transforms before stat_smooth, stat_bin, and stat_density; x columns are transformed scale-space values."
)
write_json(summary, "artifacts/scale-equivalence/pr3-position-transforms/ggplot2-reference.json", pretty = TRUE, auto_unbox = TRUE, digits = NA)
ggsave("artifacts/scale-equivalence/pr3-position-transforms/ggplot2-reference.png", p, width = 8, height = 5, dpi = 144)
