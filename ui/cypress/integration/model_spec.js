import 'cypress-iframe';

const configText = 'this is a test file\nhere is more text';
const directiveCmd = 'run file.txt --data=data.csv';

describe('Creating a model', () => {
  // this does not work - the destroy container button doesn't seem to reliably work
  // beforeEach(() => {
  //   cy.visit('/admin');
  //   cy.get('body').then(($body) => {
  //     if ($body.find('.adminDestroyModelContainerBtn').length) {
  //       cy.get('.adminDestroyModelContainerBtn').click();
  //       // console.log('hey we did it')
  //     }
  //   });
  // });

  it('Creates a model with the form', () => {
    cy.visit('/');
    cy.contains('A Model');
    cy.get('[data-test=modelFormGoBtn]').click();
    // overview form
    cy.get('[data-test=modelForm-name]').type('Test Name');
    cy.get('[data-test="modelForm-maintainer.website"]').clear().type('http://jataware.com');
    cy.get('[data-test=modelForm-family_name]').type('Test Family Name');
    cy.get('[data-test=modelForm-description]').type('This is a test description');
    cy.get('[data-test=modelFormOverviewNextBtn]').click();
    // detail form
    cy.get('[data-test="modelForm-maintainer.name"]').type('Maintainer Test Name');
    cy.get('[data-test="modelForm-maintainer.email"]').type('test@example.com');
    cy.get('[data-test="modelForm-maintainer.organization"]')
      .type('Maintainer Test Organization');
    cy.get('[data-test=modelFormStartDate]').type('01/01/2030');
    cy.get('[data-test=modelFormEndDate]').type('01/01/2040');
    cy.get('[data-test=modelFormCategory]').type('this creates four categories ');
    cy.get('[data-test=modelFormDetailBackBtn]').click();
    // back to overview form - select input by name because material ui
    cy.get('[name=name]').should('have.value', 'Test Name');
    cy.get('[data-test=modelFormOverviewNextBtn]').click();
    cy.get('[name="maintainer.name"]').should('have.value', 'Maintainer Test Name');
    cy.get('[data-test=modelFormDetailNextBtn]').click();

    // commented out for now, as it just slows down the test
    // region form
    cy.get('[data-test=modelFormExpandRegionBtn]').click();
    // add new york
    cy.get('[data-test=modelFormRegionSearch]').type('New York').then(() => {
      cy.get('[data-test=modelFormRegionSearchBtn]').click();
      cy.contains('New York, admin1').click();
      cy.get('[data-test=modelFormRegionSearchBtn]').click();
    });

    // don't add LA
    cy.get('[data-test=modelFormRegionSearch]').type('Los Angeles').then(() => {
      cy.get('[data-test=modelFormRegionSearchBtn]').click();
      cy.contains('Los Angeles, admin2').should('exist');
      cy.get('[data-test=modelFormRegionClearBtn').click();
    });

    // add texas
    cy.get('[data-test=modelFormRegionSearch]').type('Texas').then(() => {
      cy.get('[data-test=modelFormRegionSearchBtn]').click();
      cy.contains('Texas, admin1').click();
      cy.get('[data-test=modelFormRegionSearchBtn]').click();

      // check we have the correct regions
      cy.contains('New York, admin1').should('exist');
      cy.contains('Texas, admin1').should('exist');
      cy.contains('Los Angeles, admin2').should('not.exist');
    });
    // coordinates form
    cy.get('[data-test=modelFormExpandCoordsBtn]').click();
    cy.get('[data-test=modelForm-Lat1]').type('12');
    cy.get('[data-test=modelForm-Lng1]').type('21');
    cy.get('[data-test=modelForm-Lat2]').type('-12');
    cy.get('[data-test=modelForm-Lng2]').type('-21').then(() => {
      cy.get('[data-test=modelFormCoordsBtn]').click();
      // check it showed up
      cy.contains('12 21, -12 -21').should('exist');
    });

    cy.get('[data-test=modelFormSubmitBtn]').click();

    // selecting an image and worker
    cy.get('[data-test=modelBaseImageSelect]').click().then(() => {
      cy.contains('Ubuntu').click();
    });
    cy.get('[data-test=modelWorkerCardBtn]').click();
    cy.get('[data-test=modelContainerLaunchBtn]').click();

    // cy.get('.xterm-helper-textarea', { timeout: 300000 }).type('touch file.txt');
    // cy.get('.xterm-helper-textarea').type('edit file.txt').then(() => {
    //   cy.get('[data-test=terminalEditorTextArea]').type('this is a test file');
    //   cy.get('[data-test=fullScreenDialogSaveBtn]').click();
    // });
  // });

  // it('Revisits an existing model', () => {
    // cy.visit('/model');
    // wait for the container button to exist
    // cy.get('[data-test=existingContainerBtn]', { timeout: 300000 }).click();
    // wait for the textarea to exist before creating our file
    cy.get('.xterm-helper-textarea', { timeout: 300000 })
      .type('touch file.txt {enter}', { timeout: 300000 });

    // edit the file
    cy.get('.xterm-helper-textarea').type('edit file.txt {enter}').then(() => {
      // force: true here because MUI has a hidden textarea on top of the one we want
      // and cypress isn't happy about typing into a covered textarea
      cy.get('[data-test=terminalEditorTextArea] textarea:first')
        .type(configText, { force: true });
      cy.get('[data-test=fullScreenDialogSaveBtn]').click();
    });

    // go through the config flow
    cy.get('.xterm-helper-textarea')
      .type('config file.txt {enter}', { timeout: 60000 })
      .then(() => {
        cy.frameLoaded({ url: '/api/templater' }, { timeout: 60000 }).then(($iframe) => {
          // our window object is not the same in cypress tests as in a normal browser session
          // so we need to manually send these messages to manage the state of the SH iframe
          $iframe[0].contentWindow.postMessage(JSON.stringify({
            type: 'file_opened',
            editor_content: configText,
            content_id: '/home/terminal/file.txt',
          }), '*');

          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(3000).iframe().find('.editor-line').first()
            .setSelection('a test');

          cy.iframe().find('#name').type('test name');
          cy.iframe().find('#desc').type('test description');
          cy.iframe().find('#data_type').select('freeform');
          cy.iframe().find('input[type=submit]').click();

          cy.get('[data-test=fullScreenDialogSaveBtn]').click().then(() => {
            cy.window().then(($window) => {
              // send this message to trigger the fullscreendialog to close
              $window.postMessage(JSON.stringify({ type: 'params_saved' }));
            });
          });
        });
      });

    // create a data output file and add text to it
    cy.get('.xterm-helper-textarea', { timeout: 60000 }).type('touch data.csv {enter}');
    cy.get('.xterm-helper-textarea').type('edit data.csv {enter}').then(() => {
      cy.get('[data-test=terminalEditorTextArea] textarea:first')
        .type('A,B\nC,D', { force: true });

      cy.get('[data-test=fullScreenDialogSaveBtn]').click();
    });

    // go through the annotate flow
    cy.get('.xterm-helper-textarea')
      .type('tag data.csv {enter}', { timeout: 300000 }).then(() => {
        // wait until we've loaded the iframe before we start entering stuff
        cy.frameLoaded({ url: '/api/annotate/byom' }, { timeout: 300000 }).then(() => {
          cy.iframe().find('#dataset_Name').type('Test Dataset');
          cy.iframe().find('#dataset_Description').type('dataset description');
          cy.iframe().find('#dataset_Category').type('some, categories');
          cy.iframe().find('#resolution_spatial_x').type(1000);
          cy.iframe().find('#resolution_spatial_y').type(1000);
          cy.iframe().find('#submit').click();
        });
        // overview screen
        cy.frameLoaded(
          { url: '/api/annotate/overview' }, { timeout: 300000 }
        ).then(() => {
          cy.iframe().contains('Annotate').first().click();
        });
        // annotation screen
        cy.frameLoaded(
          { url: '/annotate' }, { timeout: 300000 }
        ).then(() => {
          cy.iframe().find('#Description').type('description');
          cy.iframe().find('#Units').type('test units');
          cy.iframe().find('#Unit_Description').type('test unit description');
          // actually cy.wait() a few seconds to allow the overview screen to load again
          // its url is a subset of the annotation url, so we can't check frameLoaded
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.iframe().find('#Submit_annotation').click().wait(3000)
            .then(() => {
              cy.iframe().contains('Submit', { timeout: 300000 }).click();
            });
        });
        // submit screen
        cy.frameLoaded(
          { url: '/submit' }, { timeout: 300000 }
        ).then(() => {
          cy.iframe().contains('Submit to dojo').click();
        });

        cy.get('[data-test=fullScreenDialogCloseBtn]').click();
      });

    // enter a fake run command/directive
    // wait a brief time to ensure our command shows up in the shell history
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.get('.xterm-helper-textarea').type(`${directiveCmd}{enter}`).wait(500);
    // grab the most recent terminal command's directive button
    cy.get('[data-test=terminalMarkDirectiveBtn]').last().click().then(() => {
      cy.frameLoaded({ url: '/api/templater' }, { timeout: 60000 }).then(($iframe) => {
        $iframe[0].contentWindow.postMessage(JSON.stringify({
          type: 'file_opened',
          editor_content: directiveCmd,
          content_id: directiveCmd,
        }), '*');
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(3000).iframe().find('.editor-line').first()
          .setSelection('data.csv')
          .then(() => {
            cy.iframe().find('#name').type('data');
            cy.iframe().find('#desc').type('data description');
            cy.iframe().find('#data_type').select('freeform');
            cy.iframe().find('input[type=submit]').click();
          });

        cy.get('[data-test=fullScreenDialogSaveBtn]').click().then(() => {
          cy.window().then(($window) => {
            // send this message to trigger the fullscreendialog to close
            $window.postMessage(JSON.stringify({ type: 'params_saved' }));
          });
        });
      });
    });

    cy.get('[data-test=terminalEndSessionBtn]').click().then(() => {
      cy.get('[data-test=terminalSubmitConfirmBtn]').click();
    });

    // the summary page

    // testing Edit Details
    cy.get('[data-test=summaryDetailsEditButton]', { timeout: 60000 }).click().then(() => {
      cy.contains('This is a test description').should('exist');
      // check for date
      cy.get('input[value="01/01/2040"]').should('exist');
      // check for existence of our categories
      cy.contains('creates').should('exist');
      // check for geography, delete a location
      cy.contains('New York, admin1').should('exist').siblings('svg').click()
        .then(() => {
          cy.contains('New York, admin1').should('not.exist');
          // and save the details
          cy.get('[data-test=fullScreenDialogSaveBtn]').click();
        });
    });

    // this is dumb. even chaining .then won't get this to consistently work
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);

    cy.get('[data-test=summaryDetailsEditButton]', { timeout: 60000 }).click().then(() => {
      cy.contains('New York, admin1').should('not.exist');

      // add new york back
      cy.get('[data-test=modelFormExpandRegionBtn]').click().then(() => {
        cy.get('[data-test=modelFormRegionSearch]').type('New York').then(() => {
          cy.get('[data-test=modelFormRegionSearchBtn]').click();
          cy.contains('New York, admin1').click();
          cy.get('[data-test=modelFormRegionSearchBtn]').click();
        });
      });

      cy.get('[data-test=fullScreenDialogSaveBtn]').click().then(() => {

      });
    });

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    cy.get('[data-test=summaryDetailsEditButton]', { timeout: 60000 }).click().then(() => {
      // check that adding it back in worked
      cy.contains('New York, admin1').should('exist');
      cy.get('[data-test=fullScreenDialogCloseBtn]');
    });
  });
});
