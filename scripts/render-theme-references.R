suppressPackageStartupMessages(library(ggplot2))
suppressPackageStartupMessages(library(jsonlite))

root <- getwd()
out <- file.path(root, "artifacts", "theme-equivalence")
dir.create(out, recursive = TRUE, showWarnings = FALSE)

source("/Users/liamodea/Code/hrbrthemes/R/roboto-condensed.r")
source("/Users/liamodea/Code/ggthemes/R/few.R")

df <- data.frame(
  x = rep(1:6, 3),
  y = c(2.2, 3.1, 4.7, 5.4, 7.2, 8.1, 7.5, 6.8, 6.2, 5.1, 4.4, 3.3, 4.1, 4.8, 5.3, 6.4, 6.1, 7.0),
  series = rep(c("Alpha", "Beta", "Gamma"), each = 6)
)

base <- ggplot(df, aes(x, y, color = series)) +
  geom_line(linewidth = 0.9) +
  geom_point(size = 2.25) +
  scale_x_continuous(limits = c(0, 7), breaks = 1:6, expand = expansion(mult = 0)) +
  scale_y_continuous(limits = c(0, 10), breaks = seq(0, 10, 2), expand = expansion(mult = 0)) +
  scale_color_manual(values = c("#5DA5DA", "#F17CB0", "#60BD68")) +
  labs(
    title = "Matched theme reference",
    subtitle = "Same data, domains, breaks, colors, and logical viewport",
    x = "Measurement", y = "Value", color = "Series"
  )

plots <- list(
  ggplot2 = base + theme_gray(base_size = 11, base_family = "Arial Narrow"),
  hrbr = base + theme_ipsum_rc(
    base_family = "Arial Narrow", plot_title_family = "Arial Narrow",
    subtitle_family = "Arial Narrow", caption_family = "Arial Narrow"
  ),
  few = base + theme_few(base_size = 12, base_family = "Arial Narrow")
)

theme_metrics <- list()
for (name in names(plots)) {
  path <- file.path(out, paste0("r-", name, ".png"))
  png(path, width = 1440, height = 960, res = 192, type = "cairo", antialias = "subpixel")
  print(plots[[name]])
  dev.off()

  built <- ggplot_build(plots[[name]])
  panel <- built$layout$panel_params[[1]]
  resolved <- ggplot2:::plot_theme(plots[[name]])
  element <- function(key) ggplot2::calc_element(key, resolved)
  present <- function(key) !inherits(element(key), "element_blank")
  line_width <- function(key) {
    value <- element(key)
    if (inherits(value, "element_blank") || is.null(value$linewidth)) return(0)
    value$linewidth
  }
  theme_metrics[[name]] <- list(
    width = 1440, height = 960, raster = "Cairo 192 dpi",
    xLabels = as.character(panel$x$get_labels()),
    yLabels = as.character(panel$y$get_labels()),
    axisLineX = present("axis.line.x"), axisLineY = present("axis.line.y"),
    ticksX = present("axis.ticks.x"), ticksY = present("axis.ticks.y"),
    gridMajorX = present("panel.grid.major.x"), gridMajorY = present("panel.grid.major.y"),
    gridWidth = line_width("panel.grid.major"),
    fontFamily = element("text")$family,
    fontSize = element("text")$size,
    titleSize = element("plot.title")$size,
    axisTitleSize = element("axis.title.x")$size
  )
}

write_json(theme_metrics, file.path(out, "r-metrics.json"), pretty = TRUE, auto_unbox = TRUE)
message("Rendered ", length(plots), " matched R theme references.")
