# Examples

This directory hosts two example input datasets for BinaRena.


## Traveler's Diarrhea metagenome

The file ([`TD.tsv`](TD.tsv)) is a fully processed and combined input data table that is used by the BinaRena [live demo](https://qiyunlab.github.io/binarena/demo.html). You may also launch BinaRena locally, and drag and drop this file into the interface and start to explore.

This metagenomic assembly (S50070) is derived from one of the 29 human fecal samples analyzed in a study of [Travelers' Diarrhea](https://en.wikipedia.org/wiki/Travelers%27_diarrhea) pathogenic profiles. The contig sequences are hosted at NCBI, under [GCA_003604395.1](https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_003604395.1/). The original binning and annotation results can be found in this [repository](https://github.com/sarahhigh/Travelers-Diarrhea-MAGs). Citation:

> Zhu Q, Dupont CL, Jones MB, Pham KM, Jiang ZD, DuPont HL, Highlander SK. [Visualization-assisted binning of metagenome assemblies reveals potential new pathogenic profiles in idiopathic travelers’ diarrhea.](https://microbiomejournal.biomedcentral.com/articles/10.1186/s40168-018-0579-0) _Microbiome_. 2018 Dec;6(1):1-20.


## EMP500 bioreactor metagenome

The subdirectory [`EMP`](EMP) hosts sample output files of a complete metagenomics workflow demonstrated in the [tutorial](https://github.com/qiyunlab/binarena/wiki/Tutorial) for preparing BinaRena input files. It also hosts a Bash script [`script.sh`](EMP/script.sh) for reproducing the results. Please refer to this [section](https://github.com/qiyunlab/binarena/wiki/Tutorial#finalization) on how to use these files.

This bioreactor metagenomic dataset (13114.angenent.65.s007) is part of the Earth Microbiome Project 500 ([EMP500](https://earthmicrobiome.org/emp500/)) ([PRJEB42019](https://www.ebi.ac.uk/ena/browser/view/PRJEB42019)). The sequencing data are hosted at EBI, under [ERR5004366](https://www.ebi.ac.uk/ena/browser/view/ERR5004366). Citation:

> Shaffer JP, Nothias LF, Thompson LR, Sanders JG, Salido RA, Couvillion SP, Brejnrod AD, Lejzerowicz F, Haiminen N, Huang S, Lutz HL. [Standardized multi-omics of Earth’s microbiomes reveals microbial and metabolite diversity.](https://www.nature.com/articles/s41564-022-01266-x) _Nature Microbiology_. 2022 Nov 28:1-23.
