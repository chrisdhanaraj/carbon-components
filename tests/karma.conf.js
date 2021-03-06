'use strict';

/* eslint-disable import/no-extraneous-dependencies, global-require */

const minimatch = require('minimatch');

function ensureArray(as) {
  return !as || Array.isArray(as) ? as : [as];
}

const cloptions = require('minimist')(process.argv.slice(2), {
  alias: {
    b: 'browsers',
    f: 'files',
    d: 'debug',
    v: 'verbose',
  },
  boolean: ['debug', 'verbose'],
});

module.exports = function (config) {
  config.set({
    basePath: '..',

    frameworks: ['mocha', 'sinon-chai'],

    files: (() => {
      const list = ensureArray(cloptions.files || [
        'tests/remainders.js', // For generatoring coverage report for untested files
        'tests/spec/**/*.js',
      ]);
      const htmlFiles = list.filter(file => minimatch(file, 'src/components/**/*.html'));
      if (htmlFiles.length > 0) {
        const explanationArgs = htmlFiles.map(file => `-f ${file}`).join(' ');
        // eslint-disable-next-line no-console
        console.warn('WARNING: The given files contain component sample HTML.');
        // eslint-disable-next-line no-console
        console.warn(`You may have wanted:\n\tgulp test:a11y ${explanationArgs}`);
      }
      list.unshift('demo/polyfills/index.js');
      return list;
    })(),

    exclude: [],

    preprocessors: {
      'tests/remainders.js': ['webpack', 'sourcemap'], // For generatoring coverage report for untested files
      'tests/spec/**/*.js': ['webpack', 'sourcemap'],
      'demo/polyfills/**/*.js': ['webpack', 'sourcemap'],
    },

    webpack: {
      devtool: 'inline-source-maps',
      module: {
        rules: [
          {
            test: /\.js?$/,
            exclude: /node_modules/,
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: [
                    [
                      'env',
                      {
                        modules: false,
                        chrome: 'latest',
                        edge: 'latest',
                        firefox: 'latest',
                        safari: 'latest',
                        ie: '11',
                        ios: 'latest',
                      },
                    ],
                  ],
                  plugins: [
                    'transform-class-properties',
                    ['transform-runtime', { polyfill: false }],
                  ].concat(cloptions.debug ? [] : [
                    [
                      'istanbul',
                      {
                        include: [
                          'src/components/**/*.js',
                        ],
                      },
                    ],
                  ]),
                },
              },
            ],
          },
          {
            test: /\.html?$/,
            exclude: /node_modules/,
            use: ['html-loader'],
          },
        ],
      },
    },

    webpackMiddleware: {
      noInfo: !cloptions.verbose,
      stats: cloptions.verbose ? {
        colors: true,
      } : {},
    },

    customLaunchers: {
      Chrome_Travis: {
        base: 'Chrome',
        flags: ['--no-sandbox'],
      },
    },

    plugins: [
      require('karma-mocha'),
      require('karma-sinon-chai'),
      require('karma-sourcemap-loader'),
      require('karma-mocha-reporter'),
      require('karma-coverage'),
      require('karma-webpack'),
      require('karma-phantomjs-launcher'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-safari-launcher'),
      require('karma-ie-launcher'),
    ],

    reporters: (() => {
      const reporters = ['mocha'];
      if (!cloptions.debug) {
        reporters.push('coverage');
      }
      return reporters;
    })(),

    coverageReporter: Object.assign({
      dir: 'tests/coverage',
      reporters: [
        { type: 'html' },
        { type: 'text' },
      ],
    }, cloptions.files ? {} : {
      check: {
        each: {
          statements: 40,
          branches: 40,
          functions: 40,
          lines: 40,
          excludes: [
            // Files in this exclude list are of either:
            // - Not meeting the code coverage standard set here, which shouldn't have happened
            // - Very browser dependent code that wouldn't get code coverage unless we run the suite with Sauce Labs
            // That said, new files should never be added, except for misc code that is very broser-specific
            'src/components/accordion/accordion.js',
            'src/components/copy-button/copy-button.js',
            'src/components/detail-page-header/detail-page-header.js',
            'src/components/interior-left-nav/interior-left-nav.js',
            'src/components/pagination/pagination.js',
            'src/components/search/search-with-options.js',
            'src/components/tooltip/tooltip.js',
            'src/components/unified-header/left-nav.js',
            'src/components/unified-header/profile-switcher.js',
            'src/globals/js/misc/resize.js',
          ],
        },
      },
    }),

    port: 9876,

    colors: true,

    logLevel: config.LOG_INFO,

    autoWatch: true,
    autoWatchBatchDelay: 400,

    browsers: (Array.isArray(cloptions.browsers) ? cloptions.browsers : [cloptions.browsers || 'PhantomJS'])
      .map(browser => browser + (browser === 'Chrome' && process.env.TRAVIS ? '_Travis' : '')),

    singleRun: false,

    concurrency: Infinity,
  });
};
