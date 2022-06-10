"""Perform dimensionality reduction on a data table.

Usage:
    python me.py -i kmer_freqs.tsv --pca --tsne --umap -o output

Output:
    output.pca.tsv, output.tsne.tsv, output.umap.tsv

Notes:
    This script performs choice of three common dimensionality reduction
    methods: PCA, t-SNE, and UMAP. It is suitable for converting multiple
    same-type numeric data columns, such as coverage profiles or k-mer
    frequencies, into a few dimensions that can be visualized.

    It requires Python libraries scikit-bio, scikit-learn, and umap-learn.

    The procedures are:
    0. Read data table.
    1. Add a pseudocount (default: 1) to any feature that has zeros.
    2. Perform centered log-ratio transform (CLR) on each feature.
    3. Perform principal component analysis (PCA).
    4. If there are >200 features, perform PCA to reduce to 50 features.
    5. Perform t-distributed stochastic neighbor embedding (t-SNE).
    6. Uniform manifold approximation and projection (UMAP).
"""

import sys
import argparse
from random import randint

import numpy as np
import pandas as pd

try:
    from skbio.stats.composition import clr
except ModuleNotFoundError:
    exit('This script requires Python library scikit-bio.')

try:
    from sklearn.decomposition import PCA
    from sklearn.manifold import TSNE
except ModuleNotFoundError:
    exit('This script requires Python library scikit-learn.')

try:
    from umap import UMAP
except ModuleNotFoundError:
    exit('This script requires Python library umap-learn.')


def parse_args():
    """Command-line interface.
    """
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter)
    arg = parser.add_argument
    arg('-i', '--input', type=argparse.FileType('r'), default=sys.stdin,
        help=('input data table (tab-separated, rows as samples, columns as '
              'features), default: stdin'))
    arg('--pca', action='store_true', help='perform PCA')
    arg('--tsne', action='store_true', help='perform t-SNE')
    arg('--umap', action='store_true', help='perform UMAP')
    arg('-n', '--ndim', type=int, default=2,
        help='number of dimensions, default: 2')
    arg('-p', '--pseudocount', type=float, default=1.0,
        help=('pseudocount to add to cell values of a feature if there are '
              'zeros, default: 1.0'))
    arg('-s', '--seed', type=int, help='random seed')
    arg('-o', '--output', type=str, help='output filepath stem')
    for arg in parser._actions:
        arg.metavar = ''
    if len(sys.argv) == 1:
        print(__doc__)
        parser.print_help()
        sys.exit(1)
    return parser.parse_args()


def main():
    args = parse_args()

    # parameters
    output = args.output
    ndim = args.ndim
    pseudo = args.pseudocount
    axes = [i + 1 for i in range(ndim)]

    # random seed
    seed = args.seed
    if seed is None:
        seed = randint(1, 1000)
    print(f'Use random seed {seed}.')

    # input data
    df = pd.read_table(args.input, index_col=0).astype(float)
    ids = df.index
    data = df.values
    nrow, ncol = data.shape
    print(f'Data table has {nrow} samples and {ncol} features.')

    # add pseudocount
    npseudo = 0
    for datum in data:
        if np.any(datum == 0):
            datum += pseudo
            npseudo += 1
    if npseudo:
        print(f'Added a pseudocount of {pseudo} to {npseudo} features.')

    # centered log-ratio transform
    data = clr(data)

    # Principal component analysis (PCA)
    print('Performing PCA...')
    pca = PCA(n_components=ndim, random_state=seed)
    pca.fit(data)
    print(f'Loadings: {pca.explained_variance_ratio_}')
    res = pca.transform(data)
    df = pd.DataFrame(res, index=ids, columns=[f'PC{i}' for i in axes])
    df.to_csv(f'{output}.pca.tsv', sep='\t')
    print('Done.')

    if (args.tsne or args.umap) and ncol > 200:
        print('Extracting 50 features from original data...')
        pca_ = PCA(n_components=50, random_state=seed)
        data = pca_.fit_transform(data)
        print('Done.')

    # t-distributed stochastic neighbor embedding (t-SNE)
    if args.tsne:
        print('Performing t-SNE...')
        tsne = TSNE(n_components=ndim, init='random', learning_rate=200.0,
                    random_state=seed)
        res = tsne.fit_transform(data)
        df = pd.DataFrame(res, index=ids, columns=[f'tSNE{i}' for i in axes])
        df.to_csv(f'{output}.tsne.tsv', sep='\t')
        print('Done.')

    # Uniform manifold approximation and projection (UMAP)
    if args.umap:
        print('Performing UMAP...')
        umap = UMAP(n_components=ndim, init='random', random_state=seed)
        res = umap.fit_transform(data)
        df = pd.DataFrame(res, index=ids, columns=[f'UMAP{i}' for i in axes])
        df.to_csv(f'{output}.umap.tsv', sep='\t')
        print('Done.')


if __name__ == "__main__":
    main()
