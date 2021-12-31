# BinaRena

[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
![javascript](https://badges.aleen42.com/src/javascript.svg)

**Binarena** ("bin arena") is an interative visualizer of metagenomic assembly that facilitates observation, semi-manual and semi-automatic binning of metagenomic contigs.


## [Live demo](https://qiyunlab.github.io/binarena/demo.html)

Please check out this [live demo](https://qiyunlab.github.io/binarena/demo.html). It is a fully functional program with a pre-loaded sample [dataset](https://www.ncbi.nlm.nih.gov/assembly/GCA_003604395.1/). You may close the data, then drag and drop your own data into the interface and start to analyze!


## Contents

- [Installation](#noinstallation) | [main interface](#main-interface) | [system requirements](#system-requirements) | [mouse and keyboard shortcuts](#mouse-and-keyboard-shortcuts)
- [Input files](#input-files): [data table](#data-table) | [table view](#table-view) | [special columns](#special-columns) | [additional data](#additional-data)
- [Display items](#display-items): [legends and data scaling](#legends-and-data-scaling) | [data transformation](#data-transformation) | [color coding](#color-coding)
- [Contig selection](#contig-selection) | [masking](#contig-masking) | [highlighting](#contig-highlighting) | [summary](#contig-summary) | [search](#contig-searching) | [mini plot](#mini-plot)
- [Binning plan](#binning-plan) | [table of bins](#table-of-bins) | [from selection to bin](#from-selection-to-bin)
- [Binning confidence evaluation](#binning-confidence-evaluation) | [binning plan comparison](#binning-plan-comparison)
- [FAQ](#faq) | [contact](#contact)


## (No)Installation

[Download](https://github.com/qiyunlab/binarena/archive/refs/heads/master.zip) this program, unzip, and double-click "**BinaRena.html**". That's it!

BinaRena is a client-end web application. It is written in vanilla JavaScript, with minimum usage of third-party libraries, which are all bundled in the package. it does not require installation, nor does it require a web server running in the backend. In other words, it is literally a webpage running in your browser.


## Main interface

The main interface of BinaRena is an interactive scatter plot. It focuses on the display while minimizing other visual elements to let the user concentrate on the research task. Panels can be expanded / hidden on demand. Most functions (buttons) are only visible when the user moves the mouse over relevant items.

Here is the fully expanded main interface of BinaRena.

<img src="docs/img/main.png" width="720">

Here is the default interface when the program starts.

<img src="docs/img/blank.png" width="405">


## System requirements

BinaRena runs in most modern web browsers, including **Chrome**, **Firefox**, **Edge**, and **Safari** (see screenshots below). A typical laptop is sufficient for running BinaRena.

<img src="docs/img/browsers.png" width="720">


## Mouse and keyboard shortcuts

The BinaRena interface is like a [**digital map**](https://www.google.com/maps) and is very intuitive. While although operations can be triggered through the graphical interface, the following basic operations are most convenient by using your mouse and keyboard.

- Drag the plot or use arrow keys (<code>&larr;</code>, <code>&uarr;</code>, <code>&rarr;</code> and <code>&darr;</code>) to move around.
- Zoom in/out: Mouse wheel, or use `=` and `-`.
- Click a contig to **select** it. Hold `Shift` and click to select multiple contigs.
- Click a selected contig to unselect it. Hold `Shift` and click to unselect multiple contigs.
- Press `Enter` to enter **polygon selection** mode. Then use mouse clicks to draw a polygon to contain multiple contigs. Press `Enter` again to complete selection. Hold `Shift` while pressing the second `Enter` to add contigs to the existing selection.
- Press `Delete` or `Backspace` to **mask** selected contigs. Presee `L` to **highlight** selected contigs.
- Press `Space` to **create a new bin** from selected contigs.
- Click a **bin name** to select it and all member contigs. Click it again to edit its name. Hold Shift and click to select multiple bins.
- Press `.` (`>`) to **add** selected contigs to the current bin, press `,` (`<`) to **remove** selected contigs from the current bin, press `/` to **update** the current bin with selected contigs (i.e., replace its content).
- Press `P` to take a screenshot of the current view.
- Press `0` to reset the plot view.


## Input files

BinaRena operates on one dataset at a time. A dataset is an entire **metagenomic assembly**, i.e., a collection of **contigs** (this document does not differentiate contigs and scaffolds). The information being handled is the properties of individual contigs.

To load a dataset, simply **drag and drop** the file into the blank program window.


### Data table

The most typical input file format is a **data table** (tab-delimited file, or [TSV](https://en.wikipedia.org/wiki/Tab-separated_values)) that stores properties of contigs (scaffolds) in an assembly. Here is an [example](examples/input.tsv).

<img src="docs/img/excel.png" width="597">

Each row represents one contig. The first column must be unique contig identifiers. The remaining columns are arbitrary properties (such as length, coverage, GC%, taxonomy, etc.). These fields may be in any of the following four types:

- **number**(`n`), **category**(`c`), **feature**(`f`), **description**(`d`)

The program will guess column type based on the data. To be safer, you may append a type code to a column name following a pipe (`|`), such as "`genes|n`" and "`plasmid|c`".

In a **feature**-type column, a cell can have multiple comma-separated features, such as "`Firmicutes,Proteobacteria,Cyanobacteria`".

One may assign a **weight** to each category or feature, using a numeric suffix following a colon (`:`), such as "`Ruminococcus:80`", and "`rpoB:1,dnaK:2,16S:5`".
This weight can represent quantity, proportion, confidence, etc.

Empty cells will be treated as **missing** values.

### Table view

One can click `Show data` from the context menu to open a window to browse the current dataset. Alternatively, when one or more bins are selected, one can click the <span style="background-color: lightgrey">&#9707;</span> button in the bin table toolbar to browse the data of contigs **within** these bins. Click `Export` to save the data table as a TSV file.

<img src="docs/img/table.png" width="576">

### Special columns

When a data table is loaded, BinaRena attempts to "guess" the meaning of data columns by their name and type, and displays the most relevant information. Specifically, the following fields and keyword patterns are recognized:

- **Length (bp)**: "length", "size", "len", "bp", etc.
- **Coverage (x)**: "coverage", "depth", "cov", etc.
- **GC content (%)**: "gc", "g+c", "gc%", "gc-content", etc.
- **_X_- (and _y_-axes)** (if available): "x", "xaxis", "x1", "axis1", "dim1", "pc1", "tsne1", "umap1", etc.

The matching process is case-insensitive. Suffixes after common delimiters (" ", "/", "_", ".") are stripped. For examples, `Length (bp)` and `size_of_scaffold` will be recognized as **length**.

It isn't a problem if the program misses a special column (which is very possible). One can always manually choose the most relevant [display items](#display-items).

### Additional data

When a dataset has been opened, one may append additional data files to it simply by **dragging and dropping** them into the interface. They will be filter to match the current contig IDs (first column) and appended to the right of the current data table.


## Special files

BinaRena supports several special file types that are frequently generated in typical metagenomic data analysis workflows.

### Assembly files

An assembly file is a [FASTA](https://en.wikipedia.org/wiki/FASTA_format) format file containing multiple contig sequences. BinaRena can read DNA sequences and calculate **length** and **GC content** of each contig. If this file is generated by [SPAdes](https://cab.spbu.ru/software/spades/) or [MEGAHIT](https://github.com/voutcn/megahit), BinaRena can recognize **coverage** from sequence titles.


## Display items

BinaRena is an interactive scatter plot of contigs, with five display items:

- **x-axis**, **y-axis**, **size** (radius of contig), **opacity** (alpha value), and **color**.

Each display item can be changed and tweaked in the **display panel**. When the user moves the mouse of an item, two button will emerge, one letting the user select a data transformation method, and the other letting the user display a legend.

### Legends and data scaling

BinaRena provides interactive legends to inform the user of the (**numeric**) data. Move the mouse over the legend to see the original value in real time. Menwhile, two brackets will show up at the edges of the legend. Drag them to modify the displayed range of data. The lower limit is clickable. It lets the user toggle between zero or minimum value in the data.

<img src="docs/img/legends.png" width="254">

### Data transformation

Biological data are usually highly skewed. To effectively display them, proper [transformation](https://en.wikipedia.org/wiki/Data_transformation_(statistics)) is usually necessary. BinaRena provides various transformation methods that can be easily selected from a dropdown menu next to the field selection box.

<img src="docs/img/scale.png" width="68">

Specifically, BinaRena supports the following transformations:

- Square, cube, 4th power.
- Square root, cube root, 4th root.
- Logarithm and exponential.
- [Logit](https://en.wikipedia.org/wiki/Logit) and [arcsine](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Arcsine_transformation) (for proportion data).
- [Ranking](https://en.wikipedia.org/wiki/Ranking#Ranking_in_statistics).

Note: Certain values may become invalid after certain transformation. For example, zero and negative numbers cannot be log-transformed. In such cases, the contigs will be displayed using the default setting (e.g., color is grey).


### Color coding

The color panel has an additional dropdown menu to let the user choose from multiple standard color palettes.

<img src="docs/img/palettes.png" width="395">

For **categorical** data, BinaRena automatically identifies and colors the **most frequent** categories in the dataset, while leaving all remaining categories in black. One may use the floating <span style="background-color: lightgrey;">&plus;</span> and <span style="background-color: lightgrey;">&minus;</span> buttons to increase / decrease the number of colored categories.

<img src="docs/img/color_cat.png" width="240">


## Contig selection

In the interactive scatter plot, one can simple click circles (**contigs**) to select them. Hold `Shift` and click to select multiple. Click selected ones to unselect them.

A more efficient may is to press `Enter` or click the <span style="background-color: lightgrey">&#11040;</span> button in the corner to enter the **polygon** selection mode.

<img src="docs/img/widgets.png" width="160">

Then one can click on the plot to draw a polygon to contain contigs of interest. When done, press `Enter` again and these contigs will be selected.

<img src="docs/img/polyogn.png" width="304">

Hold `Shift` when finishing selection will add the contigs to the current selection.


## Contig masking

One can press the `Delete` key or click the <span style="background-color: lightgrey">&empty;</span> button in the corner to **mask** currently selected contigs. These contigs will disappear from the plot. They will also be excluded from subsequent operations (e.g., they cannot be selected, nor can they influence calculation of metrics). This function is useful for cloaking unwanted contigs during binning.

<img src="docs/img/mask.png" width="271">

The masked contigs are not deleted from the dataset. They can be released back to the view by clicking the <span style="background-color: lightgrey">&times;</span> button next to the masked number.

- Note that masked contigs will not be immediated deleted from bins. One can click the <span style="background-color: lightgrey">&empty;</span> button in the bin table toolbar to remove masked contigs from all bins.


## Contig highlighting

One can press the `L` key or click the <span style="background-color: lightgrey">&#9673;</span> button in the corner to **highlight** currently selected contigs. Moreover, one may select one of multiple highlight colors from the menu.

<img src="docs/img/highlight.png" width="350">

The highlight will stay with the contigs no matter how the layout and display items change, until the user click the <span style="background-color: lightgrey">&times;</span> button next to each color to release them.

Highlighting will not affect binning, search, calculation and operations. It serves as a visual annotation of contigs to make them noticeable to the user.


## Contig summary

BinaRena displays a summary of properties of the select contigs in real time to let the user see what's included. Each row represents a field. When the user moves the mouse over a row, a mini control panel will show up.

<img src="docs/img/info.png" width="330">

When multiple contigs are selected, the displayed value of **numeric** fields is calculated using either **mean** (<span style="background-color: lightgrey; text-decoration: overline;"><i>x</i></span>) or **sum** (<span style="background-color: lightgrey">&Sigma;<i>x</i></span>) of the contigs, optionally **weighted** by another variable. BinaRena attempts to "guess" the most relevant metric for each column. For examples, "length" should be the sum of lengths of all contigs, whereas "coverage" should be the average of coverages of the contigs, weighted by contig length. One can mouse hover the displayed value to see how it is exactly calculated, and tweak the metrics (in case BinaRena didn't guess right).

For **categorical** columns, the displayed category is the **majority-rule** category, if there are multiple options (i.e., the selected contigs are a mixture), determined by weighting against the contig length (one can tweak this). The relative frequency of the main category is displayed in the parentheses. If no category is over half, the row will be displayed as "ambiguous", while the most frequent category can be found in the tooltip during mouse hovering.

One may click the <span style="background-color: lightgrey">&#9684;</span> button in each row to display a histogram of the distribution of this variable in a [mini plot](#mini-plot).


## Contig searching

The **Search** panel offers functions to search the assembly for contigs that match given criteria.

For numeric fields, enter (or leave empty) maximum and minimum thresholds. Click the boundaries to toggle between inclusion (`()`) and exclusion (`[]`).

<img src="docs/img/search_num.png" width="270">

For categorical, feature set and descriptive fields, enter a keyword to search. The keyword box can auto-complete based on current categories and features. Click `Aa` to toggle case sensitivity and `""` to toggle whole/partial matching.

<img src="docs/img/search_cat.png" width="270">

For feature set field, the whole contig will match as long as any feature on it matches.


## Mini plot

The mini plot panel displays an interactive **histogram** of a user-chosen variable of the selected contigs. Mouse over the bars to display the range and size of them. Click `log` to apply log-transformation. Click `+` and `-` to increase / decrease the number of bars.

One may use mouse **dragging** to select a range of bars. The contigs will be filtered down to the selected range.

<img src="docs/img/miniplot.png" width="327">

This miniplot faciliates the user to observe the distribution of the variable in a set of contigs, and further perform filtering based on the observation. For examples, one may remove **contaminations** from a bin which appear to be outliers in the histogram; one may also separate two **closely related strains** which show a bimodal distribution in the histogram.


## Binning plan

One may create a binning plan from _de novo_ or load an existing one from a **categorical** field. Each category represents a bin. The name, number of contigs (`#`), total length of contigs (`kb`) and the relative abundance (calculated as length x coverage, then normalized against the entire assembly) are displayed.

<img src="docs/img/plan.png" width="338">

When a binning plan is modified (added/removed bins, added/removed contigs to/from bins, renamed bins, entered a new plan name, etc.), a <span style="background-color: lightgrey">Save</span> button will show up. Click it to save the **binning plan** as a categorical field.

Alternatively, click the <span style="background-color: lightgrey;">&rarrb;</span> button in the toolbar to export the binning plan to a text file. The format will be a mapping of bin names to member contig IDs.


## Table of bins

The table below the binning plan name displays a list of bins in the plan. Click a bin to select it. The contigs in this bin will be [selected](#contig-selection) in the same time and their properties will be [summarized](#contig-summary).

<img src="docs/img/bin_n_sel.png" width="564">

Click the bin again to edit its name. Press `Enter` when done. Hold `Shift` and click to select multiple bins.

The toolbar next to the bin table provides a few utilities. Click <span style="background-color: lightgrey;">&plus;</span> to create an empty new bin. Click <span style="background-color: lightgrey;">&minus;</span> to delete the selected bin(s), Click <span style="background-color: lightgrey;">&cup;</span> to merge multiple bins.

<img src="docs/img/bins.png" width="334">


## From selection to bin

Press `Space` to **create a new bin from selected contigs**. If no binning plan is currently loaded, the program will create a new plan. This is perhaps the easiest way to start **de novo binning** using the program.

Press `.` to add selected contigs to the select bin. Press `,` to remove selected contigs from the selected bin. Press `/` to update (replace) the selected bin with selected contigs.

These functions can also be found in the toolbar next to the summary table.


## Binning confidence evaluation

BinaRena calculates the [**silhouette coefficient**](https://en.wikipedia.org/wiki/Silhouette_(clustering)) to evaluate the **confidence** of binning. Specifically, a silhouette coefficient measures how similar a contig is to other contigs in the same bin, as in contrast to contigs in other bins. It ranges from -1 (worse) to 1 (best).

One may click the <span style="background-color: lightgrey">&#9739;</span> button in the toolbar next to the binning plan to open the "silhouette coefficient" window. It allows the user to select variables to be included in the calculation.

- Note: Only select variables that are presumably **homogeneous** in each bin (e.g., GC%, coverage, _k_-mer frequency). Don't select those that aren't (e.g., length of contig).

Then click the "calculate" button to start calculation. When done, the mean silhouette coefficient of each bin and all bins will be displayed in a table.

<img src="docs/img/silhouette.png" width="600">

Before pressing "done", one may check "save result to field" to save the calculated silhouette coefficient to a categorical field. BinaRena will automatically color the contigs using these values, from which one can immediately see which bins are of high overall confidences and which contigs are confidently belonging to their bins. This can guide the subsequent binning efforts.

<img src="docs/img/silh_color.png" width="880">

One may also check "export result to file" to save the results (contig IDs, bin assignments and silhouette coefficients) to a TSV file.

- Be warned not to over-interpret silhouette coefficient. It is a widely-used metric for [cluster analysis evaluation](https://en.wikipedia.org/wiki/Cluster_analysis#Evaluation_and_assessment). However, other biological factors may also be important in the task of binning.


## Binning plan comparison

BinaRena compares two binning plans by calculating the [**adjusted Rand index**](https://en.wikipedia.org/wiki/Rand_index) (ARI), which measures the **consistency** between two grouping scenarios of the same dataset. Higher is better. Two identical plans have ARI = 1. Two random plans will have an ARI close to 0.

One may click the <span style="background-color: lightgrey">&harr;</span> button in the toolbar next to the binning plan, then select a categorical field (another binning plan) to perform this calculation. It is fast. The result will be displayed in a floating message box.


## FAQ

**Do old browsers support BinaRena?**

BinaRena is written in JavaScript, using mordern language standards including [ES6](https://www.w3schools.com/js/js_es6.asp) and above. Mordern browsers shouldn't have problems as they normally auto-update to meet the latest standards. However, very outdated browsers such as Internet Explorer may not support BinaRena.

**Does BinaRena expose my data to a remote server?**

The standalone BinaRena program is a client-end webpage that runs in your browser. Theoretically and technically, it cannot communicate with a web server. There is no risk with regard to the confidentiality of your data.

The live demo hosted by [GitHub Pages](https://pages.github.com/) can communicate with the GitHub repository, and the only thing it does is to [retrieve](demo.html) the sample dataset from the repository directory. It does not perform any other communication.

**Where are the color palettes in BinaRena from?**

Most of these color palettes were adopted from [Matplotlib](https://matplotlib.org/stable/tutorials/colors/colormaps.html), which have been widely utilized in Python data science. The default categorical palette "QIIME" was adopted from the EMPeror viewer of the microbiome data analysis package [QIIME 2](https://qiime2.org/).

**How does BinaRena perform [data ranking](https://en.wikipedia.org/wiki/Ranking#Ranking_in_statistics)?**

BinaRena sorts numeric values from small to large and assign them ranks 1, 2, 3... If there are ties, all numbers in a tie will receive the **average** rank of them. This behavior is consistent with the default behavior of SciPy's [`rankdata`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html) function.

**How exactly does BinaRena calculate silhouette coefficients?**

The silhouette coefficient calculation algorithm in BinaRena was implemented in reference to Scikit-learn's [`silhouette_score`](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.silhouette_score.html) function to achieve compatible results. Prior to this final step, several operations are involved for data preprocessing:

The contigs are filtered to exclude those 1) that are not in any bin, 2) that are currently [masked](#contig-masking), 3) that have invalid values in any of the variables after [transformation](#data-transformation). The remaining data are subject to [min-max scaling](https://en.wikipedia.org/wiki/Feature_scaling#Rescaling_(min-max_normalization)) (consistent with the default behavior of Scikit-learn's [`MinMaxScaler`](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.MinMaxScaler.html)) such that each variable is within the range of [0, 1]. Then, the pairwise [Euclidean distances](https://en.wikipedia.org/wiki/Euclidean_distance) between contigs are calculated using the scaled variables. Finally, the silhouette coefficients were calculated.

One can monitor the process and intermediates using the browser's **console**.

**Why does the program stall / crash during silhouette coefficient calculation?**

Calculation of silhouette coefficients requires the calculation of a Euclidean distance matrix among all contigs. This is a computationally expensive operation. Runtime and memory consumption quickly build up as the dataset expands (_O_(_n_<sup>2</sup>)).

However, with a typical computer, it shouldn't take more than a few minutes even with tens of thousands of contigs. Just be bit patient before killing the browser tab.

- Note: Chrome and Edge have a mechanism to limit memory consumption per tab, hence blocking this function from handling more than some ten thousand of contigs. Firefox and Safari do not have this limitation.

When compute is an issue, it is recommended to filter down the dataset (e.g., removing short and shallow contigs) to make the calculation smooth.


## Contact

Please forward any questions to the project leader: **Dr. Qiyun Zhu** (qiyunzhu@gmail.com).
