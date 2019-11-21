import React from 'react';
import config from '../../../config';
import { Card } from 'material-ui/Card';
import $ from 'jquery';

const cardStyle = {
    'textAlign': "center"
};

const InfoBox = React.createClass({

    render () {
        const personalLink = config.WEB_ROOT + '/personal/#' + this.props.publicKey;

        return (
            <Card>
                <a target='_blank' href={personalLink}>
                    <h3 style={cardStyle}>No one except researchers should use this extension!</h3>
                    <smaller>
                        Currently, we lack documenting the proper data processing; therefore this extension is not ready to be used.
                        If you use this, it is because you are collaborating with the development team.
                    </smaller>
                    <img width="100%" src="/amazon-spy-wired.png" />
                </a>
            </Card>
        );
    }
});

export default InfoBox;
