#!/bin/bash
: 'Example metagenomics workflow for generating input data files for BinaRena.

Please refer to the tutorial: https://github.com/qiyunlab/binarena/wiki/Tutorial
'

# Software tools (please customize as needed)
# conda create -n binarena-tutorial -c conda-forge -c bioconda megahit scikit-learn umap-learn bowtie2 samtools kraken2 prokka metabat2 checkm-genome
# conda activate binarena-tutorial

# BinaRena scripts
wget https://github.com/qiyunlab/binarena/archive/refs/heads/master.zip
mkdir scripts && unzip -j master.zip binarena-master/scripts/*.py -d scripts
chmod +x scripts/*.py
rm master.zip

# Sequencing data
for i in 1 2; do
  wget ftp://ftp.sra.ebi.ac.uk/vol1/fastq/ERR500/006/ERR5004366/ERR5004366_${i}.fastq.gz
done

# Metagenomic assembly
megahit -t 8 -1 ERR5004366_1.fastq.gz -2 ERR5004366_2.fastq.gz --min-contig-len 1000 -o megahit
ln -s megahit/final.contigs.fa contigs.fna

# Basic contig metrics
scripts/sequence_basics.py -i contigs.fna -a megahit -o basic.tsv

# k-mer signatures
mkdir -p kmers && scripts/count_kmers.py -i contigs.fna -k 5 | scripts/reduce_dimension.py --pca --tsne --umap -o k5

# Coverage calculation
mkdir -p bt2idx && bowtie2-build --threads 8 contigs.fna bt2idx/contigs
bowtie2 -p 8 -x bt2idx/contigs -1 ERR5004366_1.fastq.gz -2 ERR5004366_2.fastq.gz --no-unal | samtools sort -O bam > mapping.bam
samtools coverage mapping.bam > coverage.tsv
head -n1 basic.tsv > tmp.tsv
join -j1 -t$'\t' <(tail -n+2 basic.tsv | cut -f1-3 | sort -k1,1) <(tail -n+2 coverage.tsv | cut -f1,7 | sort -k1,1) | sort -V >> tmp.tsv
mv tmp.tsv basic.tsv

# Taxonomic classification
wget https://genome-idx.s3.amazonaws.com/kraken/k2_standard_20230314.tar.gz
mkdir -p k2idx && tar xvf k2_standard_20230314.tar.gz -C k2idx
rm k2_standard_20230314.tar.gz
kraken2 --db k2idx --threads 8 contigs.fna --output kraken2.output --report kraken2.report
scripts/kraken_to_table.py -i kraken2.output -r kraken2.report -o taxonomy.tsv

# Functional annotation
prokka contigs.fna --cpus 8 --outdir prokka --prefix contigs
scripts/gff_to_features.py -i prokka/contigs.gff -t gene -o gene.map

# Automatic binning
mkdir metabat2
jgi_summarize_bam_contig_depths --outputDepth metabat2/depth.txt mapping.bam
metabat2 -t 8 -i contigs.fna -a metabat2/depth.txt -o metabat2/bin -m 1500
for i in metabat2/bin.*.fa; do
  bin=$(basename -s .fa $i)
  cat $i | grep ^'>' | cut -c2- | sed 's/$/\t'$bin'/' >> metabat2.map
done

# Bin quality evaluation
mkdir -p checkm/Bacteria
checkm taxonomy_wf domain Bacteria . checkm/Bacteria
scripts/checkm_marker_map.py checkm/Bacteria/storage/marker_gene_stats.tsv > checkm/Bacteria.map
scripts/checkm_marker_list.py checkm/Bacteria/Bacteria.ms > checkm/Bacteria.lst
