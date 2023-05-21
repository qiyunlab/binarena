#!/usr/bin/env python3
"""Calculate k-mer frequencies of individual DNA sequences.

Examples:
    python me.py -i input.fna -k 4 -o output.tsv
    zcat input.fna.gz | python me.py -k 5 | gzip > output.tsv.gz

Notes:
    This is an exact k-mer counter. The frequencies of all k-mers will be
    reported. Both forward and reverse strands are considered. k-mers with
    non-ACGT characters are discarded. Upper and lower cases are both fine.

    The output is a tab-separated table with rows as sequence identifiers and
    columns as all possible k-mers (including unobserved ones).

    Note: This k-mer counter is optimized for small k-values (k = 4, 5, 6...)
    and many sequences, which are typical for the task of contig binning. It
    is not efficient for large k-values (e.g., k = 35).

    Note: The output file may be large, especially for relatively big k's.
    One may consider piping the output to a downstream application.
"""

import sys
import argparse
import unittest


def parse_args():
    """Command-line interface.
    """
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter)
    arg = parser.add_argument
    arg('-i', '--input', type=argparse.FileType('r'), default=sys.stdin,
        help='input DNA sequences (multi-FASTA), default: stdin')
    arg('-k', '--kvalue', type=int, default=4,
        help='k-mer size, default: 4')
    arg('-l', '--minlen', type=int,
        help='minimum length threshold')
    arg('-o', '--output', type=argparse.FileType('w'), default=sys.stdout,
        help='output k-mer frequency table, default: stdout')
    for arg in parser._actions:
        arg.metavar = ''
    if len(sys.argv) == 1:
        print(__doc__)
        parser.print_help()
        sys.exit(1)
    return parser.parse_args()


def main():
    args = parse_args()

    # minimu length threshold
    minlen = args.minlen or 0

    # output file
    out = args.output

    # valid bases
    chars = 'ACGT'

    # function to get base index (forward and reverse)
    # tobit = chars.index
    tobit = chars.find

    # k-mer size
    k = args.kvalue

    # total number of kmers
    n = len(chars) ** k

    # print header (all possible k-mers)
    head = list_kmers(chars, k, n)
    print('', '\t'.join(head), sep='\t', file=out)

    # extract k-mer frequencies
    name, seq, freqs = '', '', None
    for line in args.input:
        if line[0] == '>':
            if seq and len(seq) >= minlen:
                freqs = count_kmers(seq, k, n, tobit)
                print(name, '\t'.join(map(str, freqs)), sep='\t', file=out)
            name, seq = line[1:].rstrip().split()[0], ''
        else:
            seq += line.rstrip().upper()
    if seq and len(seq) >= minlen:
        freqs = count_kmers(seq, k, n, tobit)
        print(name, '\t'.join(map(str, freqs)), sep='\t', file=out)


def list_kmers(chars, k, n):
    """List all possible k-mers.

    Parameters
    ----------
    chars : str
        All valid characters.
    k : int
        k-mer size.
    n : int
        Total number of k-mers.

    Returns
    -------
    list of str
        All possible k-mers.
    """
    res = [''] * n
    for i in range(n):
        idx, kmer = i, ''
        for _ in range(k):
            kmer = chars[idx & 4 - 1] + kmer
            idx >>= 2
        res[i] = kmer
    return res


def count_kmers(seq, k, n, tobit):
    """Count k-mers.

    Parameters
    ----------
    seq : str
        DNA sequence.
    k : int
        k-mer size.
    n : int
        Total number of k-mers.
    tobit : callable
        Convertor of character into bit.

    Returns
    -------
    np.array
        k-mer frequencies.

    Notes
    -----
    This function uses bitwise operations to accelerate calculation.
    """
    # pre-allocate result
    res = [0] * n

    # forward & reverse indices, current # characters
    fwd, rev, m = 0, 0, 0

    # cache intermediates
    q = (k - 1) * 2
    x = (1 << q) - 1

    # count k-mers
    for bit in map(tobit, seq):

        # invalid character
        if bit == -1:
            fwd, rev, m = 0, 0, 0

        # current k-mer is complete, move to next k-mer
        elif m == k:
            fwd = ((fwd & x) << 2) + bit
            rev = (rev >> 2) + ((3 - bit) << q)

            # add count
            res[fwd] += 1
            res[rev] += 1

        # current k-mer is incomplete, add one character
        else:
            fwd = bit + (fwd << 2)
            rev += (3 - bit) << 2 * m
            m += 1

            # if complete, add count
            if m == k:
                res[fwd] += 1
                res[rev] += 1
    return res


class Tests(unittest.TestCase):
    def setUp(self):
        self.chars = 'ACGT'

    def test_list_kmers(self):
        k = 2
        n = len(self.chars) ** k
        obs = list_kmers(self.chars, k, n)
        exp = ['AA', 'AC', 'AG', 'AT',
               'CA', 'CC', 'CG', 'CT',
               'GA', 'GC', 'GG', 'GT',
               'TA', 'TC', 'TG', 'TT']
        self.assertListEqual(obs, exp)

    def test_count_kmers(self):
        tobit = self.chars.index

        k = 2
        n = len(self.chars) ** k
        obs = count_kmers('ACGT', k, n, tobit)
        exp = [0, 2, 0, 0,
               0, 0, 2, 0,
               0, 0, 0, 2,
               0, 0, 0, 0]
        self.assertListEqual(obs, exp)

        obs = count_kmers('GCACTA', k, n, tobit)
        exp = [0, 1, 1, 0,
               1, 0, 0, 1,
               0, 2, 0, 1,
               2, 0, 1, 0]
        self.assertListEqual(obs, exp)

        k = 3
        n = len(self.chars) ** k
        obs = count_kmers('CCAGCTGCGTAACCGAGAAACTACGTCT', k, n, tobit)
        exp = [1, 2, 0, 0, 0, 1, 3, 1, 2, 2, 0, 1, 0, 0, 0, 0,
               0, 0, 2, 0, 1, 0, 1, 0, 1, 1, 1, 3, 1, 1, 2, 0,
               1, 1, 1, 0, 1, 0, 1, 2, 0, 0, 0, 1, 2, 1, 0, 2,
               1, 2, 1, 0, 0, 0, 1, 2, 0, 1, 1, 0, 1, 1, 0, 1]
        self.assertListEqual(obs, exp)


if __name__ == "__main__":
    main()
