library(ggplot2)
d <- read.csv('artifacts/scale-equivalence/pr1-temporal-semantics/fixture.csv')
d$date <- as.Date(paste0(d$year, '-01-01'))
p <- ggplot(d, aes(date, value)) +
  geom_line(linewidth = 0.55) +
  labs(title = 'Long-run index, 1835–2025', subtitle = 'ggplot2 scale_x_date reference', x = 'Year', y = 'Index') +
  theme_grey(base_size = 11)
ggsave('artifacts/scale-equivalence/pr1-temporal-semantics/ggplot2-reference.png', p, width = 6.4, height = 4, dpi = 100)
writeLines(capture.output(ggplot_build(p)$layout$panel_params[[1]]$x$get_labels()), 'artifacts/scale-equivalence/pr1-temporal-semantics/ggplot2-labels.txt')
