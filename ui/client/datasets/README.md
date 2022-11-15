
This namespaces aka folder describe a dataset registration flow, which regularly includes 
a step where users need to annotate and operate on tabular data, annotating column information
for the dataset.

## Tests

### Unit tests
Files that end with *.test.js contain tests for their sibling file that matches the * glob.

These are run with:
```
npm run test
```

### Component tests
We use cypress to run integration and component tests. To open the cypress component runner:
```
npm run cypress:component
```

or to run the tests from the terminal:

```
npx cypress run-ct
```

### Storybook
To check out and play with annotations/* components in a sandbox, run:
```
npm run storybook
```

and navigate to http://localhost:6006

## Some definitions

##### RawFileName
WHen registering or updating a dataset, and uploading a file to the backend services through the API, the original filename is stored, as well as a reference to the raw file data before it is processed by Dojo. The raw data uploaded by the user is then referenced as raw file (or source file), and stored using the following naming convention:

- First file, csv upload: raw_data.csv
- Second file, another csv iupload: raw_data_2.csv
- Third file, a netcdf upload: raw_data_3.nc
- Fourth file, a geotiff upload: raw_data_4.tif

##### Annotating

Adding associated typed (categorized) data to a column from the tabular representation from the dataset sample data. It is performed column by column.

##### Column

Both a visible column on the Table Annotations tabular view, as well as used as reference of what is currently being annotated.

##### Field

Either a Cell.field or Column.Field from the Table/DataGrid library used, or a ControlField (eg TextField, InputField). The Cell.field and Column.fields from the grid are then references as Columns or ColumnNames only outside of this table/grid. Users annotate columns, so we try to maintain this distinction.

##### MultiPart Column

Columns grouped together to create a new supercolumn, or superset column. If familiar with table dimensions, it is similar to creating an additional dimension, grouping those columns together. It can also be seen as a category-subcategory relationship. At some point this is also referred as a "Virtual Column", since we edit the column of the combination of children columns for UI purposes, but we shouldn't see this term often (only when dealing with virtual vs real column logic).

##### MultiPart Base

The base "parent" column of the multiPart relationship. Depending on how a multipart relation is created, this might just be the starting point of the "linking", the original column that started the operation, or the desired mark that the relationship started by this column.

##### MultiPart Member

Any column that is part of a MultiPart column. At least 2 (else, it is just a regular column).

##### Category | Type

Categorized column data by metadata backend, or annotated by the user. Also known as Type on UI form displayed to user. This is known as Type on the backend annotation endpoint as well.

##### Alias

When annotating a column, _values_ that can be treated as equal or should be replaced by anothers can be specified with aliases. For example, if a value is shown as 1.0, and we prefer to read it as 1, we can alias from 1.0 => 1. Same with strings and dates- we may wish to re-format or replace the few instances with aliases.

##### Inferred Data

Column data pre-classified by server. It isnot said to be annotated yet, but starting a column annotation will pre-populate the data that the server was able to infer. Also referred to as `hint` within code.

##### Primary Column

The primary annotated column for a geo or date. A feature cannot be marked as primary, and at least one geo and one date column need to be annotated as primary; only one of each, but a MultiPart column can be the primary field.

##### Geo Columns

Single Latitude or Longitudes, a combination of both as Coordinate Pairs, or specific admin locations (0-3).

##### Date Columns

Date or Datetime data. May be referred as 'date' and/or 'time' interchangeable on backend, saved as `time` on UI, but consistently displayed to the user as `Date`.


## Relevant Files

#### index

Includes some common files, still uncategorized from the rest of the dataset/ folder

#### RegistrationStepper

Controller-like file that keeps track of the state used to determine the current step, and data, in the annotation process.
This file actually mounts a MUI stepper component with arbitrary steps, and mounts the below components throughout Dataset registration.

#### Register

Landing page when we start Dataset Metadata Registration. It is commonly Step 1 on RegistrationStepper. This is where the user uploads the original file (csv, excel, netcdf), etc.

#### Annotate

Landing page for Dataset column-like data annotation. Here we specify the data type for each column (also known as fields). It is a container component that fetches the data for the current step and passes it to TableAnnotation.

#### Table/*

The Table view itself seen on the Annotate Dataset step. It will format headings, rows, columns, and cells. It also handles all logic related to user events such as hover and click on table cells in order to annotate a column.

#### ColumnPanel

The Drawer that opens to annotate a column after selecting a column from TableAnnotation. It also wraps the rest of its internal components in a Form context, in order to package all annotation to then send up for Annotate to track. This file sets up the default form field values (many times empty string), but also decides how to merge the inferred/hint/default data that comes from the server.

#### ColumnAnnotation

Exports the Form field elements themselves, used to annotate a column/field from the dataset. It will have many <Field> elements and props for them (required, etc). It contains some light business logic.

#### dataIn/dataOUT

Contains functions to format annotations from/to server (since there are some differences on data shape), as well as other misc functions to create multi-part column data formatted for Table annotation.

#### annotationRules

Contains much of the heavy business logic used for validating annotation rules. Mostly derived from the Google doc that contains all rules while annotating (is a primary field present? does it conflict with other properties). Mostly used by COlumnPanel before submitting a column annotation up to Annotate, but may contain some smaller helper functions for other components.
